var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};


exports.listen = function (server) {
    //Starts socket.io server, allowing it to piggybank on existing HTTP Server
    io = socketio.listen(server);
    io.set('log level', 1);

    //Define how each user connection will be handled
    io.sockets.on('connection', function (socket) {
        //Assign user a guest name when they connect.
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        //Place user in Lobby room when they connect.
        joinRoom(socket, 'Lobby');

        //Handle use messages, name change attempts, and room creation/changes.
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        //Provide user with list of occupied rooms on request
        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms);
        });

        //Define cleanup logic for when user dissconnects.
        handleClientDisconnection(socket, nickNames, namesUsed);

    });



    function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
        var name = 'Guest' + guestNumber;  //generate new guest name
        nickNames[socket.id] = name;       //Associate guest name with client connection id.
        socket.emit('nameResult', {    //let user know their guest name
            success: true,
            name: name
        });

        namesUsed.push(name);   //note the gues name is used
        return guestNumber + 1;   //Increment counter used to generate guest name
    }


    function joinRoom(socket, room) {
        socket.join(room);    //Make user join room
        currentRoom[socket.id] = room;  //Note that user is now in this room.
        socket.emit('joinResult', { room: room });  //let user know they're now in room
        socket.broadcast.to(room).emit('message', {  //let other users in room know that user has joined.
            text: nickNames[socket.id] + 'has joined ' + room + '.'
        });

        var usersInRoom = io.sockets.clients(room);  //Determine what other users are in same room as user.
        if (usersInRoom.length > 1) {  // if other user exists summerize who they are.
            var usersInRoomSummary = 'Users currently in' + room + ':';
            for (var index in usersInRoom) {
                var userSocketId = usersInRoom[index].id;
                if (userSocketId != socket.id) {
                    if (index > 0) {
                        usersInRoomSummary += ', ';
                    }

                    usersInRoomSummary += nickNames[userSocketId];
                }
            }

            usersInRoomSummary += '.';
            socket.emit('message', { text: usersInRoomSummary });   // send summary of other users in the room to the user.
        }

    }


    //Logic to handle name-request attempts
    function handleNameChangeAttempts(socket, nickNames, namesUsed) {
        socket.on('nameAttempt', function (name) {  //Add listener for nameAtaempts events
            if (name.indexOf('Guest') == 0) {   //Dont allow nicknames to begin with guest
                socket.emit('nameResult', {
                    success: false,
                    message: 'Name cannot begin with "Guest".'
                });
            } else {
                if (namesUsed.indexOf(name) == -1) {   //if name isn't already regisered, register it 
                    var previousName = nickNames[socket.id];
                    var previousNameIndex = namesUsed.indexOf(previousName);
                    namesUsed.push(name);
                    nickNames[socket.id] = name;
                    delete namesUsed[previousNameIndex];   //Remove previous name to make available to other clients

                    socket.emit('nameResult', {
                        success: true,
                        name: name
                    });

                    socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                        text: previousName + 'is now known as ' + name + '.'
                    });
                } else {
                    socket.emit('nameResult', {    //send error to client if name is already.
                        success: false,
                        message: 'That name is already in use.'
                    });
                }
            }
        });
    }


    function handleMessageBroadcasting(socket) {
        socket.on('message', function (message) {
            socket.broadcast.to(message.room).emit('message', {
                text: nickNames[socket.io] + ': ' + message.text
            });
        });
    }


    function handleRoomJoining(socket) {
        socket.on('join', function (room) {
            socket.leave(currentRoom[socket.id]);
            joinRoom(socket, room.newRoom);
        });
    }


    function handleClientDisconnection(socket) {
        socket.on('disconnect', function () {
            var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
            delete namesUsed[nameIndex];
            delete nickNames[socket.id];
        });
    }
}