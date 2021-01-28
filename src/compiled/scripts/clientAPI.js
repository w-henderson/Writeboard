var firebase;
var Swal;
var Client;
(function (Client) {
    var database = firebase.database();
    Client.analytics = firebase.analytics();
    Client.roomId = window.location.search.substr(1);
    var maximisedRef;
    var lastStrokeUpdate = -1;
    Client.maximised = false;
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
                        if (snapshot.val() !== null && _snakeCase(login) in snapshot.val()) {
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
                    Client.userId = _snakeCase(result.value);
                    Client.analytics.logEvent("join", { roomId: Client.roomId, username: Client.username });
                    Client.userRef = database.ref("rooms/" + Client.roomId + "/users/" + Client.userId);
                    Client.userRef.set({
                        name: Client.username,
                        board: Graphics.exportImage(400, 300),
                        maximised: false,
                        messages: []
                    });
                    maximisedRef = database.ref("rooms/" + Client.roomId + "/users/" + Client.userId + "/maximised");
                    maximisedRef.on("value", updateMaximised);
                    window.setTimeout(updateBoard, 5000);
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
    function updateBoard(force) {
        if (force === void 0) { force = false; }
        if (lastStrokeUpdate !== strokes || force) {
            Client.userRef.update({
                board: Client.maximised ? Graphics.exportImage(800, 600, 0.8) : Graphics.exportImage(400, 300)
            });
            lastStrokeUpdate = strokes;
        }
        window.setTimeout(updateBoard, Client.maximised ? 1000 : 5000); // update more frequently if maximised
    }
    function updateMaximised(e) {
        Client.maximised = e.val();
        if (Client.maximised) {
            updateBoard(true);
        }
    }
    window.addEventListener("beforeunload", function () {
        Client.analytics.logEvent("leave", { roomId: Client.roomId, username: Client.username });
        return Client.userRef.remove().then(function () { return; });
    });
    var Chat;
    (function (Chat) {
        Chat.visible = false;
        function showChat() {
            document.querySelector("div.main").className = "main chatShown";
            document.querySelector("div.clientChat").className = "clientChat chatShown";
            document.querySelector("div.clientChat i").textContent = "clear";
            document.querySelector("div.clientChat div.toggle").onclick = hideChat;
            Chat.visible = true;
            toolbarTransition();
        }
        Chat.showChat = showChat;
        function hideChat() {
            document.querySelector("div.main").className = "main";
            document.querySelector("div.clientChat").className = "clientChat";
            document.querySelector("div.clientChat i").textContent = "message";
            document.querySelector("div.clientChat div.toggle").onclick = showChat;
            Chat.visible = false;
            toolbarTransition();
        }
        Chat.hideChat = hideChat;
        function toolbarTransition() {
            window.setInterval(Functionality.placeToolbar, 16.7);
            window.setTimeout(window.clearInterval, 500);
        }
    })(Chat = Client.Chat || (Client.Chat = {}));
})(Client || (Client = {}));
var _snakeCase = function (string) {
    return string.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(function (word) { return word.toLowerCase(); })
        .join('_');
};
