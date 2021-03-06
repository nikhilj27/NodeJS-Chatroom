
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}


// Processing raw user Input
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val()
      , systemMessage;
  
    // If user input begins with a slash, treat it as a command
    if (message[0] == '/') {
      systemMessage = chatApp.processCommand(message);
      if (systemMessage) {
        $('#messages').append(divSystemContentElement(systemMessage));
      }
  
    // Broadcast non-command input to other users
    } else {
      chatApp.sendMessage($('#room').text(), message);
      $('#messages').append(divEscapedContentElement(message));
      $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
  
    $('#send-message').val('');
  }

// client-side application initialization logic

var socket = io.connect();
$(document).ready(function () {
    var chatApp = new Chat(socket);

    socket.on('nameResult', function (result) {   // Display result of name change attempt
        var message;

        if (result.success) {
            message = 'You are known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });


    socket.on('joinResult', function (result) {   // Display result of room changed.
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });

    socket.on('message', function (message) {  // Display received messages.
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    socket.on('rooms', function (rooms) {    // Display list of rooms available
        $('#room-list').empty();

        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }


        $('#room-list div').click(function () {   // allow click of room name to change to that room
            chatApp.processCommand('/join' + $(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function(){   // Request list of rooms available intermittently.
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    $('#send-form').submit(function(){   // Allow submitting the form to send that chat message.
        processUserInput    (chatApp, socket);
        return false;
    });
});