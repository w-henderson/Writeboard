var Swal;
var firebase;
var Host;
(function (Host) {
    var database = firebase.database();
    var analytics = firebase.analytics();
    Host.roomId = window.localStorage.getItem("writeboardTempId");
    Host.userCache = {};
    var ref;
    var titleRef;
    var maximisedRef;
    window.addEventListener("load", function () {
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
            ref = database.ref("rooms/" + Host.roomId + "/users");
            titleRef = database.ref("rooms/" + Host.roomId + "/name");
            titleRef.once("value", updateTitle);
            ref.on("child_added", addWhiteboard);
            ref.on("child_changed", updateWhiteboard);
            ref.on("child_removed", removeWhiteboard);
            window.localStorage.removeItem("writeboardTempId");
        }
        document.querySelector("input#messageInput").onkeyup = Chat.sendMessage;
    });
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
        var messageIndicator = document.createElement("div");
        userWhiteboard.src = e.val().board;
        userWhiteboard.onclick = Chat.clickHandler;
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIndicator.style.display = "none";
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        userNode.appendChild(messageIndicator);
        whiteboards.appendChild(userNode);
        Host.userCache[e.key] = {
            data: e.val(),
            seenMessages: 0
        };
    }
    function updateWhiteboard(e) {
        var data = e.val();
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = data.board;
        userNode.querySelector("span").firstChild.textContent = data.name;
        Host.userCache[e.key].data = e.val();
        if (e.key === Host.maximisedUser)
            Chat.updateMaximised();
        if (Host.userCache[e.key].data.messages && Object.keys(Host.userCache[e.key].data.messages).length > Host.userCache[e.key].seenMessages) {
            userNode.querySelector("div").style.display = "block";
            userNode.querySelector("div").textContent = (Object.keys(Host.userCache[e.key].data.messages).length - Host.userCache[e.key].seenMessages).toString();
        }
        else {
            userNode.querySelector("div").style.display = "none";
        }
    }
    function removeWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.remove();
        if (e.key === Host.maximisedUser)
            Chat.hideMaximised(true);
        delete Host.userCache[e.key];
        if (document.querySelector("div.whiteboards").innerHTML === "")
            document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";
    }
    window.addEventListener("beforeunload", function () {
        analytics.logEvent("closeRoom", { roomId: Host.roomId });
        return database.ref("rooms/" + Host.roomId).remove().then(function () { return; });
    });
    var Chat;
    (function (Chat) {
        Chat.seenMessages = {};
        function showMaximisedBoard(id) {
            var div = document.querySelector("div.maximised");
            div.querySelector("img").src = document.querySelector("div#" + id + " img").src;
            div.querySelector("span").textContent = document.querySelector("div#" + id + " span").firstChild.textContent;
            div.onclick = closeClickHandler;
            div.className = "maximised shown";
            Host.maximisedUser = id;
            updateMaximised();
            maximisedRef = database.ref("rooms/" + Host.roomId + "/users/" + Host.maximisedUser);
            maximisedRef.update({
                maximised: true
            });
        }
        Chat.showMaximisedBoard = showMaximisedBoard;
        function updateMaximised() {
            var div = document.querySelector("div.maximised");
            div.querySelector("img").src = Host.userCache[Host.maximisedUser].data.board;
            var messagesDiv = document.querySelector("div.messages");
            messagesDiv.innerHTML = "";
            if (Host.userCache[Host.maximisedUser].data.messages) {
                for (var messageId in Host.userCache[Host.maximisedUser].data.messages) {
                    var outerSpan = document.createElement("span");
                    var innerSpan = document.createElement("span");
                    outerSpan.className = Host.userCache[Host.maximisedUser].data.messages[messageId].sender + "Message";
                    innerSpan.textContent = Host.userCache[Host.maximisedUser].data.messages[messageId].content;
                    outerSpan.appendChild(innerSpan);
                    messagesDiv.appendChild(outerSpan);
                }
                messagesDiv.lastChild.scrollIntoView();
                Host.userCache[Host.maximisedUser].seenMessages = Object.keys(Host.userCache[Host.maximisedUser].data.messages).length;
            }
        }
        Chat.updateMaximised = updateMaximised;
        function hideMaximised(deleted) {
            if (deleted === void 0) { deleted = false; }
            var div = document.querySelector("div.maximised");
            div.className = "maximised";
            div.onclick = null;
            if (!deleted) {
                maximisedRef.update({
                    maximised: false
                });
            }
            else {
                Swal.fire({
                    title: "User left the room.",
                    text: "The user you were viewing has just left the room, so the connection to their board has been lost.",
                    icon: "warning",
                    background: "var(--background)"
                });
            }
            maximisedRef.off();
            maximisedRef = undefined;
            Host.maximisedUser = undefined;
        }
        Chat.hideMaximised = hideMaximised;
        function sendMessage(e) {
            e.preventDefault();
            if (e.keyCode !== 13)
                return;
            var input = document.querySelector("input#messageInput");
            var messageText = input.value;
            input.value = "";
            var messagesRef = database.ref("rooms/" + Host.roomId + "/users/" + Host.maximisedUser + "/messages").push();
            messagesRef.set({
                sender: "host",
                content: messageText
            });
        }
        Chat.sendMessage = sendMessage;
        function clickHandler(e) {
            showMaximisedBoard(e.target.parentNode.id);
        }
        Chat.clickHandler = clickHandler;
        function closeClickHandler(e) {
            if (e.target.className === "maximised shown")
                hideMaximised();
        }
        Chat.closeClickHandler = closeClickHandler;
    })(Chat = Host.Chat || (Host.Chat = {}));
})(Host || (Host = {}));
