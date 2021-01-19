var firebase;
var Swal;
var Client;
(function (Client) {
    Client.database = firebase.database(); // REMOVE EXPORT IN PRODUCTION
    Client.roomId = window.location.search.substr(1);
    var lastStrokeUpdate = -1;
    var titleRef = Client.database.ref("rooms/" + Client.roomId + "/name");
    var ref = Client.database.ref("rooms/" + Client.roomId + "/users");
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
                    Client.userRef = Client.database.ref("rooms/" + Client.roomId + "/users/" + Client.userId);
                    Client.userRef.set({
                        name: Client.username,
                        board: Graphics.exportImage(400, 300)
                    });
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
                window.location.href = "/";
            });
        }
    }
    function updateBoard() {
        if (lastStrokeUpdate !== strokes) {
            Client.userRef.update({
                name: Client.username,
                board: Graphics.exportImage(400, 300)
            });
            lastStrokeUpdate = strokes;
        }
    }
    window.addEventListener("beforeunload", function () {
        return Client.userRef.remove().then(function () { return; });
    });
})(Client || (Client = {}));
var snakeCase = function (string) {
    return string.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(function (word) { return word.toLowerCase(); })
        .join('_');
};
