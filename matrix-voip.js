console.log("Loading browser sdk");
const BASE_URL = "https://media-us-staging.kalpa.com";

const client = matrixcs.createClient({
    baseUrl: BASE_URL,
    deviceId: Date.now().toString()
});

window.onload = function () {
    disableButtons(true, true, true);
};

function login() {
    username = document.getElementById("username").value
    password = document.getElementById("pass").value
    if (username.length == 0 || password.length ==0) {
        window.alert("Enter a username and password")
    }
    client.login("m.login.password", {"user": username, "password": password}).then((response) => {
        // TODO handle failed login
        console.log(response.access_token);

        disableLogin();
        
        document.getElementById("result").innerHTML = "<p>Please wait. Syncing...</p>";
        client.startClient();
    });
}

let call;

function disableButtons(place, answer, hangup) {
    document.getElementById("hangup").disabled = hangup;
    document.getElementById("answer").disabled = answer;
    document.getElementById("call").disabled = place;
}

function disableLogin() {
    document.getElementById("login-form").style.display = "none"
}

function addListeners(call) {
    let lastError = "";
    call.on("hangup", function () {
        disableButtons(false, true, true);
        document.getElementById("result").innerHTML = "<p>Call ended. Last error: " + lastError + "</p>";
    });
    call.on("error", function (err) {
        lastError = err.message;
        call.hangup();
        disableButtons(false, true, true);
    });
    call.on("feeds_changed", function (feeds) {
        const localFeed = feeds.find((feed) => feed.isLocal());
        const remoteFeed = feeds.find((feed) => !feed.isLocal());

        const remoteElement = document.getElementById("remote");
        const localElement = document.getElementById("local");

        if (remoteFeed) {
            remoteElement.srcObject = remoteFeed.stream;
            remoteElement.play();
        }
        if (localFeed) {
            localElement.muted = true;
            localElement.srcObject = localFeed.stream;
            localElement.play();
        }
    });
}

client.on("sync", function (state, prevState, data) {
    switch (state) {
        case "PREPARED":
            syncComplete();
            break;
    }
});

function syncComplete() {
    let roomsPromise = client.getJoinedRooms(function (err, data) {
        console.log("Public Rooms: %s", JSON.stringify(data));
    });
    roomsPromise.then(
        function(value) {
            var rooms = value.joined_rooms;

            var roomsContainer = document.getElementById('rooms');
            
            var heading = document.createElement('h3');
            heading.innerText = 'Select a room';
            roomsContainer.appendChild(heading);
            
            for (i=0; i<rooms.length; i++) {
                let roomId = rooms[i];
                
                var radiobox = document.createElement('input');
                radiobox.type = 'radio';
                radiobox.id = roomId;
                radiobox.value = roomId;
                radiobox.name = 'selected-room'
                if (i == 1) { radiobox.required = 'required'; }
                
                var label = document.createElement('label')
                label.htmlFor = roomId;
                
                var description = document.createTextNode(client.getRoom(roomId).name);
                label.appendChild(description);
                var newline = document.createElement('br');
                
                roomsContainer.appendChild(radiobox);
                roomsContainer.appendChild(label);
                roomsContainer.appendChild(newline);    
            }

            document.getElementById("result").innerHTML = "<p>Ready for calls.</p>";

            disableButtons(false, true, true);

            document.getElementById("call").onclick = function () {
                console.log("Placing call...");
                
                var rooms = document.getElementsByName('selected-room');
                var selectedRoomId = null;
                for(i = 0; i < rooms.length; i++) {
                    if(rooms[i].checked)
                        selectedRoomId = rooms[i].value;
                }

                call = matrixcs.createNewMatrixCall(client, selectedRoomId);
                console.log("Call => %s", call);
                addListeners(call);
                call.placeVideoCall();
                document.getElementById("result").innerHTML = "<p>Placed call.</p>";
                disableButtons(true, true, false);
            };
        
            document.getElementById("hangup").onclick = function () {
                console.log("Hanging up call...");
                console.log("Call => %s", call);
                call.hangup();
                document.getElementById("result").innerHTML = "<p>Hungup call.</p>";
            };
        
            document.getElementById("answer").onclick = function () {
                console.log("Answering call...");
                console.log("Call => %s", call);
                call.answer();
                disableButtons(true, true, false);
                document.getElementById("result").innerHTML = "<p>Answered call.</p>";
            };
        
            client.on("Call.incoming", function (c) {
                console.log("Call ringing");
                disableButtons(true, false, false);
                document.getElementById("result").innerHTML = "<p>Incoming call...</p>";
                call = c;
                addListeners(call);
            });

        },
        function(error) { 
            window.alert("Unable to get your rooms");

        }
    );
}
