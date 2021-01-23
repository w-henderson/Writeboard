var firebase;
var Swal;
var Client;
(function (Client) {
    var database = firebase.database();
    Client.analytics = firebase.analytics();
    Client.roomId = window.location.search.substr(1);
    var messageRef;
    var lastStrokeUpdate = -1;
    var titleRef = database.ref("rooms/" + Client.roomId + "/name");
    var ref = database.ref("rooms/" + Client.roomId + "/users");
    titleRef.on("value", updateTitle);
    function updateTitle(e) {
        var data = e.val();
        if (data !== null) {
            document.querySelector("h1").textContent = "Writeboard: " + data;
            document.title = data + " - Writeboard";
            Swal.fire({
                title: 'Choose a username for this Writeboard.',
                icon: "info",
                input: 'text',
                confirmButtonText: 'Join',
                background: "var(--background)",
                showLoaderOnConfirm: true,
                preConfirm: function (login) {
                    return ref.once("value").then(function (snapshot) {
                        if (snapshot.val() !== null && snakeCase(login) in snapshot.val()) {
                            Swal.showValidationMessage("Username already taken!");
                            return false;
                        }
                        else if (login.length === 0) {
                            Swal.showValidationMessage("You must choose a username!");
                            return false;
                        }
                        else {
                            return login;
                        }
                    });
                },
                allowOutsideClick: false
            }).then(function (result) {
                if (result.isConfirmed) {
                    Client.username = result.value;
                    Client.userId = snakeCase(result.value);
                    Client.analytics.logEvent("join", { roomId: Client.roomId, username: Client.username });
                    Client.userRef = database.ref("rooms/" + Client.roomId + "/users/" + Client.userId);
                    Client.userRef.set({
                        name: Client.username,
                        board: Graphics.exportImage(400, 300),
                        message: ""
                    });
                    messageRef = database.ref("rooms/" + Client.roomId + "/users/" + Client.userId + "/message");
                    messageRef.on("value", showMessage);
                    window.setInterval(updateBoard, 5000);
                }
            });
        }
        else {
            Swal.fire({
                title: "Whiteboard Doesn't Exist",
                text: "This could be due to a bad link, or the room host may have closed their browser.",
                icon: "error",
                background: "var(--background)"
            }).then(function () {
                Client.analytics.logEvent("failJoin", { roomId: Client.roomId });
                window.location.href = "/";
            });
        }
    }
    function updateBoard() {
        if (lastStrokeUpdate !== strokes) {
            Client.userRef.update({
                board: Graphics.exportImage(400, 300)
            });
            lastStrokeUpdate = strokes;
        }
    }
    function showMessage(e) {
        if (e.val() === null || e.val() === "")
            return;
        var message = document.createElement("div");
        message.className = "message";
        var titleSpan = document.createElement("span");
        var messageText = document.createTextNode(e.val());
        titleSpan.textContent = "Message from the host:";
        message.appendChild(titleSpan);
        message.appendChild(messageText);
        document.body.appendChild(message);
        window.setTimeout(function () {
            message.remove();
        }, 8000);
    }
    window.addEventListener("beforeunload", function () {
        Client.analytics.logEvent("leave", { roomId: Client.roomId, username: Client.username });
        return Client.userRef.remove().then(function () { return; });
    });
})(Client || (Client = {}));
var snakeCase = function (string) {
    return string.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(function (word) { return word.toLowerCase(); })
        .join('_');
};
