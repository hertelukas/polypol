const socket = io.connect('https://polypol.io/');
var messageForm = document.getElementById('send-container');
var messageInput = document.getElementById('message-input');
var messageContainer = document.getElementById('message-container');

socket.emit('new-user', name);

socket.on('chat-message', data => {
    appendMessage(` <small><b>${data.name}</b><br> ${new Intl.DateTimeFormat('en', options).format(data.time)}</small>  <br> ${data.message} `, 'foreign-message');
});

function appendMessage(message, classname){
    const messageElement = document.createElement('div');
    messageElement.classList.add(classname);
    messageElement.innerHTML = message;
    messageContainer.append(messageElement);
}

var options = {month: 'short', day: '2-digit', hour: 'numeric', minute: 'numeric'};