var Swal;
var firebase;
var Host;
(function (Host) {
    var database = firebase.database();
    Host.roomId = window.localStorage.getItem("writeboardTempId");
    if (!Host.roomId) {
        Swal.fire({
            title: "Error 404",
            text: "Writeboard Not Found",
            icon: "error",
            background: "var(--background)"
        }).then(function () {
            window.location.href = "/";
        });
    }
    else {
        var ref = database.ref("rooms/" + Host.roomId + "/users");
        var titleRef = database.ref("rooms/" + Host.roomId + "/name");
        titleRef.once("value", updateTitle);
        ref.on("child_added", addWhiteboard);
        ref.on("child_changed", updateWhiteboard);
        ref.on("child_removed", removeWhiteboard);
        window.localStorage.removeItem("writeboardTempId");
    }
    function updateTitle(e) {
        var data = e.val();
        document.title = data + " - Writeboard";
        document.querySelector("h1").textContent = data + " (" + Host.roomId + ")";
    }
    function addWhiteboard(e) {
        var whiteboards = document.querySelector("div.whiteboards");
        if (whiteboards.textContent.trim() === "Waiting for people to connect...")
            whiteboards.innerHTML = "";
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        userWhiteboard.src = e.val().board;
        userName.textContent = e.val().name;
        userNode.id = e.key;
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        whiteboards.appendChild(userNode);
        console.log("Added whiteboard");
    }
    function updateWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = e.val().board;
        userNode.querySelector("span").textContent = e.val().name;
        console.log("Updated whiteboard");
    }
    function removeWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.remove();
        if (document.querySelector("div.whiteboards").innerHTML === "")
            document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";
        console.log("Removed whiteboard");
    }
    window.addEventListener("beforeunload", function () {
        return database.ref("rooms/" + Host.roomId).remove().then(function () { return; });
    });
})(Host || (Host = {}));
