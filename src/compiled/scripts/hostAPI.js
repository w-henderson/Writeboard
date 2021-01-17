var firebase;
var Host;
(function (Host) {
    Host.database = firebase.database(); // REMOVE EXPORT IN PRODUCTION
    Host.roomId = "ABCDEF";
    var ref = Host.database.ref("rooms/" + Host.roomId + "/users");
    var titleRef = Host.database.ref("rooms/" + Host.roomId + "/name");
    titleRef.once("value", updateTitle);
    ref.on("child_added", addWhiteboard);
    ref.on("child_changed", updateWhiteboard);
    ref.on("child_removed", removeWhiteboard);
    function updateTitle(e) {
        var data = e.val();
        document.querySelector("h1").textContent = "Writeboard (Host): " + data;
    }
    function addWhiteboard(e) {
        var whiteboards = document.querySelector("div.whiteboards");
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        userWhiteboard.src = e.val().board;
        userName.textContent = e.val().name;
        userNode.id = snakeCase(e.val().name);
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        whiteboards.appendChild(userNode);
        console.log("Added whiteboard");
    }
    function updateWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + snakeCase(e.val().name));
        userNode.querySelector("img").src = e.val().board;
        userNode.querySelector("span").textContent = e.val().name;
        console.log("Updated whiteboard");
    }
    function removeWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + snakeCase(e.val().name));
        userNode.remove();
        console.log("Removed whiteboard");
    }
    var snakeCase = function (string) {
        return string.replace(/\W+/g, " ")
            .split(/ |\B(?=[A-Z])/)
            .map(function (word) { return word.toLowerCase(); })
            .join('_');
    };
})(Host || (Host = {}));
