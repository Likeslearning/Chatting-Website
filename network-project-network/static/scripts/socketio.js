document.addEventListener('DOMContentLoaded', () => {
    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    // Retrieve username
    const username = document.querySelector('#get-username').innerHTML;

    // Set default room
    let room = "Lounge"
    joinRoom("Lounge");
    // Hiding Logs except superuser
    const public = document.querySelector('#Publichistory');
    const private = document.querySelector('#Privatehistory');
    if(username!=="admin"){
        public.style.display="none";
        private.style.display="none";
    }

    // Send messages
    document.querySelector('#send_message').onclick = () => {
            // If its private
            if(room=="Private"){ 
                if(username!==document.querySelector('#usersFromDB').value){
                    var cryptedMsg = (CryptoJS.AES.encrypt(document.querySelector('#user_message').value, 'capp')).toString();  
                    socket.emit('incoming-msg',
                    {'msg': cryptedMsg,
                    'username': username,
                    'room': room,
                    "toWho": document.querySelector('#usersFromDB').value});
                }
            }
            // If its not private
            else{ 
                var cryptedMsg = (CryptoJS.AES.encrypt(document.querySelector('#user_message').value, 'capp')).toString(); 
                socket.emit('incoming-msg',
                {'msg': cryptedMsg,
                'username': username,
                'room': room,
                "toWho":null});
            } 
            document.querySelector('#user_message').value = ''; // Clear text area
    };

    // Display all incoming messages
    socket.on('message', data => {
        
        // Online users printing left side
        if(data.joining=="1"){
            var c = document.getElementById("onlineUsers").innerHTML=" "; // Reset online users seciton
            var online_users = data.online_users; // Getting online users as an array from python flask.
            if(room=="Lounge"){ // You can add private to this to print users while in private room
                for (i in online_users){
                    const p = document.createElement('p');
                    p.innerHTML = online_users[i];
                    p.setAttribute("id", `${online_users[i]}`);
                    //Append
                    document.querySelector('#onlineUsers').append(p);
                }
            }
        }
        // Printing logs for superuser to the public log room
        if(room==="Publichistory"){
            var publicMessages = data.PublicMessages; // Getting Public messages from database     
            var publicUsers = data.PublicUsers;
            for (i in publicMessages){
                const p = document.createElement('p');
                const span_username = document.createElement('span');
                const br = document.createElement('br')
                p.setAttribute("class", "others-msg");
                // Username
                span_username.setAttribute("class", "my-username");
                span_username.innerText = publicUsers[i];
                // Decrypt
                var bytes = CryptoJS.AES.decrypt(publicMessages[i].toString(), 'capp');
                var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);
                p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML; 
                //Append
                document.querySelector('#display-message-section').append(p);
            }
        }
        // Printing logs for superuser to the private log room
        if(room==="Privatehistory"){
            var privateMessages = data.PrivateMessages; // Getting Private messages from database     
            var privateUsers = data.PrivateUsers;
            var toWhoList = data.toWhoList;
            for(i in privateMessages){
                const p = document.createElement('p');
                const span_username = document.createElement('span');
                const span_toWho = document.createElement('span');
                const br = document.createElement('br')
                p.setAttribute("class", "others-msg");
                // Username
                span_username.setAttribute("class", "other-username");
                span_username.innerText = privateUsers[i] + "=>" + toWhoList[i] ;
                // Decrypt
                var bytes = CryptoJS.AES.decrypt(privateMessages[i].toString(), 'capp');
                var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);
                p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML; 
                //Append
                document.querySelector('#display-message-section').append(p);
                console.log("Eklendi");
            }
        } 
        // Message printing part
        if((data.msg) && (data.toWho !== null)){ // If msg sent private
            // Display current message
            const p = document.createElement('p');
            const span_username = document.createElement('span');
            const span_toWho = document.createElement('span');
            const span_timestamp = document.createElement('span');
            const br = document.createElement('br')
            // Display user's own message
            if (data.username == username) {
                p.setAttribute("class", "my-msg");
                // Username
                span_username.setAttribute("class", "my-username");
                span_username.innerText = data.username + "=>" + data.toWho;

                // Timestamp
                span_timestamp.setAttribute("class", "timestamp");
                span_timestamp.innerText = data.time_stamp;
                // Decrypt
                var bytes = CryptoJS.AES.decrypt(data.msg.toString(), 'capp');
                var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);
                // HTML to append
                p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML + span_timestamp.outerHTML // Sirali bir sekilde bunlari koyuyor

                //Append
                document.querySelector('#display-message-section').append(p);
            }
            // Display other users' messages
            else if ((typeof data.username !== 'undefined')) {
                if((data.toWho==username) || (username=="admin")){
                    p.setAttribute("class", "others-msg");

                    // Username
                    span_username.setAttribute("class", "other-username");
                    span_username.innerText = data.username+ "=>" + data.toWho;

                    // Timestamp
                    span_timestamp.setAttribute("class", "timestamp");
                    span_timestamp.innerText = data.time_stamp;
                    
                    // Decrypt
                    var bytes = CryptoJS.AES.decrypt(data.msg.toString(), 'capp');
                    var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);
                    
                    // HTML to append
                    p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML + span_timestamp.outerHTML;

                    //Append
                    document.querySelector('#display-message-section').append(p);
                }
            }
            // Display system message private
            else {
                printSysMsg(data.msg);
            }
        }
        else if (data.msg){ // If msg didnt sent private
            // Display current message
            const p = document.createElement('p');
            const span_username = document.createElement('span');
            const span_timestamp = document.createElement('span');
            const br = document.createElement('br')
            // Display user's own message
            if (data.username == username) {
                    p.setAttribute("class", "my-msg");

                    // Username
                    span_username.setAttribute("class", "my-username");
                    span_username.innerText = data.username;

                    // Timestamp
                    span_timestamp.setAttribute("class", "timestamp");
                    span_timestamp.innerText = data.time_stamp;

                    // Decrypt
                    var bytes = CryptoJS.AES.decrypt(data.msg.toString(), 'capp');
                    var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);

                    // HTML to append
                    p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML + span_timestamp.outerHTML // Sirali bir sekilde bunlari koyuyor

                    //Append
                    document.querySelector('#display-message-section').append(p);
            }
            // Display other users' messages
            else if (typeof data.username !== 'undefined') {
                p.setAttribute("class", "others-msg");

                // Username
                span_username.setAttribute("class", "other-username");
                span_username.innerText = data.username;

                // Timestamp
                span_timestamp.setAttribute("class", "timestamp");
                span_timestamp.innerText = data.time_stamp;

                // Decrypt
                var bytes = CryptoJS.AES.decrypt(data.msg.toString(), 'capp');
                var DecryptMsg = bytes.toString(CryptoJS.enc.Utf8);

                // HTML to append
                p.innerHTML += span_username.outerHTML + br.outerHTML + DecryptMsg + br.outerHTML + span_timestamp.outerHTML;

                //Append
                document.querySelector('#display-message-section').append(p);
            }
            // Display system message public
            else {
                printSysMsg(data.msg);
            }
        scrollDownChatWindow();
        }
    });

    // Select a room
    document.querySelectorAll('.select-room').forEach(p => {
        p.onclick = () => {
            let newRoom = p.innerHTML
            // Check if user already in the room
            if (newRoom === room) {
                msg = `You are already in ${room} room.`;
                printSysMsg(msg);
            } else {
                leaveRoom(room);
                joinRoom(newRoom);
                room = newRoom;
            }
        };
    });

    // Logout from chat
    document.querySelector("#logout-btn").onclick = () => {
        leaveRoom(room);
    };

    // Trigger 'leave' event if user was previously on a room
    function leaveRoom(room) {
        socket.emit('leave', {'username': username, 'room': room});

        document.querySelectorAll('.select-room').forEach(p => {
            p.style.color = "black";
        });
    }

    // Trigger 'join' event
    function joinRoom(room) {
        // Hiding some unnecessary parts from superuser

        const send_message =  document.querySelector('#send_message');
        const options_area =  document.querySelector('#options-area');
        const user_message =  document.querySelector('#user_message');

        if((room=="Privatehistory") || (room=="Publichistory") ){
            send_message.style.display="none";
            options_area.style.display="none";
            user_message.style.display="none";
        }
        else if(username==="admin"){
            send_message.style.display="unset";
            options_area.style.display="unset";
            user_message.style.display="unset";
        }   
        
        // Hiding private message dropdownlist while in Lounge room
        if(room=="Lounge"){
            options_area.style.display="none";
        }
        else if(room=="Private"){
            options_area.style.display="unset";
        }

        // Join room
        socket.emit('join', {'username': username, 'room': room}); // Flask icerisindeki on_join calistirilir icine data gonderilir.

        // Highlight selected room
        document.querySelector('#' + CSS.escape(room)).style.color = "#ffc107";
        document.querySelector('#' + CSS.escape(room)).style.backgroundColor = "white";

        // Clear message area
        document.querySelector('#display-message-section').innerHTML = ''; // Odaya girdigin zaman mesajlari temizle

        // Autofocus on text box
        document.querySelector("#user_message").focus();
    }

    // Scroll chat window down
    function scrollDownChatWindow() {
        const chatWindow = document.querySelector("#display-message-section");
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Print system messages
    function printSysMsg(msg) {
        const p = document.createElement('p');
        p.setAttribute("class", "system-msg");
        p.innerHTML = msg;
        document.querySelector('#display-message-section').append(p);
        scrollDownChatWindow()

        // Autofocus on text box
        document.querySelector("#user_message").focus();
    }
});
