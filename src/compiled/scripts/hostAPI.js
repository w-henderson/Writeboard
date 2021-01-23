var Swal;
var firebase;
var Host;
(function (Host) {
    var database = firebase.database();
    var analytics = firebase.analytics();
    Host.roomId = window.localStorage.getItem("writeboardTempId");
    if (!Host.roomId) {
        Swal.fire({
            title: "Error 404",
            text: "Writeboard Not Found",
            icon: "error",
            background: "var(--background)"
        }).then(function () {
            analytics.logEvent("failHost", {});
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
        analytics.logEvent("host", { roomId: Host.roomId, title: data });
    }
    function addWhiteboard(e) {
        var whiteboards = document.querySelector("div.whiteboards");
        if (whiteboards.textContent.trim() === "Waiting for people to connect...")
            whiteboards.innerHTML = "";
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        var messageIcon = document.createElement("i");
        userWhiteboard.src = e.val().board;
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIcon.className = "material-icons-round";
        messageIcon.textContent = "message";
        messageIcon.onclick = function (e) {
            var userId = e.target.parentNode.parentNode.id;
            var userName = e.target.parentNode.firstChild.textContent;
            var messageRef = database.ref("rooms/" + Host.roomId + "/users/" + userId + "/message");
            Swal.fire({
                title: "Message to " + userName + ":",
                text: "This will pop up on " + userName + "'s screen.",
                icon: "info",
                input: 'text',
                confirmButtonText: 'Send Message',
                background: "var(--background)",
                allowOutsideClick: true,
                preConfirm: function (msg) {
                    if (msg.length === 0) {
                        Swal.showValidationMessage("You can't send an empty message!");
                        return false;
                    }
                    else {
                        return msg;
                    }
                }
            }).then(function (result) {
                if (result.isConfirmed) {
                    messageRef.set(result.value);
                    Swal.fire({
                        title: "Message sent!",
                        text: "Your message has been successfully sent.",
                        icon: "success",
                        background: "var(--background)"
                    });
                }
            });
        };
        userName.appendChild(messageIcon);
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        whiteboards.appendChild(userNode);
        console.log("Added whiteboard");
    }
    function updateWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = e.val().board;
        userNode.querySelector("span").firstChild.textContent = e.val().name;
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
        analytics.logEvent("closeRoom", { roomId: Host.roomId });
        return database.ref("rooms/" + Host.roomId).remove().then(function () { return; });
    });
})(Host || (Host = {}));
