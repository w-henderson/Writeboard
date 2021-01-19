var Swal: any;
var firebase: any;

namespace Host {
  var database = firebase.database();
  export var roomId = window.localStorage.getItem("writeboardTempId");

  if (!roomId) {
    Swal.fire({
      title: "Error 404",
      text: "Writeboard Not Found",
      icon: "error",
      background: "var(--background)"
    }).then(() => {
      window.location.href = "/";
    });
  } else {
    var ref = database.ref(`rooms/${roomId}/users`);
    var titleRef = database.ref(`rooms/${roomId}/name`);
    titleRef.once("value", updateTitle);

    ref.on("child_added", addWhiteboard);
    ref.on("child_changed", updateWhiteboard);
    ref.on("child_removed", removeWhiteboard);

    window.localStorage.removeItem("writeboardTempId");
  }

  function updateTitle(e) {
    let data = e.val();
    document.title = `${data} - Writeboard`;
    document.querySelector("h1").textContent = `${data} (${roomId})`;
  }

  function addWhiteboard(e) {
    let whiteboards = document.querySelector("div.whiteboards");
    if (whiteboards.textContent.trim() === "Waiting for people to connect...") whiteboards.innerHTML = "";

    let userNode = document.createElement("div");
    let userWhiteboard = document.createElement("img");
    let userName = document.createElement("span");

    userWhiteboard.src = e.val().board;
    userName.textContent = e.val().name;
    userNode.id = e.key;

    userNode.appendChild(userWhiteboard);
    userNode.appendChild(userName);
    whiteboards.appendChild(userNode);

    console.log("Added whiteboard");
  }

  function updateWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.querySelector("img").src = e.val().board;
    userNode.querySelector("span").textContent = e.val().name;

    console.log("Updated whiteboard");
  }

  function removeWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.remove();

    if (document.querySelector("div.whiteboards").innerHTML === "") document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";

    console.log("Removed whiteboard");
  }

  window.addEventListener("beforeunload", () => {
    return database.ref(`rooms/${roomId}`).remove().then(() => { return });
  });
}