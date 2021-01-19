var Swal: any;
var firebase: any;

namespace Host {
  export var database = firebase.database(); // REMOVE EXPORT IN PRODUCTION
  export var roomId = window.localStorage.getItem("writeboardTempId");

  if (!roomId) {
    Swal.fire({
      title: "Error 404",
      text: "Writeboard Not Found",
      icon: "error",
      background: "var(--background)"
    }).then(() => {
      document.querySelector("div.main").innerHTML = "<h1>Error 404:<br>Writeboard Not Found</h1>";
      document.title = "Error 404 - Writeboard";
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
    document.querySelector("h1").textContent = `Writeboard (${roomId}): ${data}`;
  }

  function addWhiteboard(e) {
    let whiteboards = document.querySelector("div.whiteboards");

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

    console.log("Removed whiteboard");
  }

  window.addEventListener("beforeunload", () => {
    return database.ref(`rooms/${roomId}`).remove().then(() => { return });
  });
}