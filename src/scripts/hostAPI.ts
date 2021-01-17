var firebase: any;

namespace Host {
  export var database = firebase.database(); // REMOVE EXPORT IN PRODUCTION
  export var roomId = "ABCDEF";

  var ref = database.ref(`rooms/${roomId}/users`);
  var titleRef = database.ref(`rooms/${roomId}/name`);
  titleRef.once("value", updateTitle);

  ref.on("child_added", addWhiteboard);
  ref.on("child_changed", updateWhiteboard);
  ref.on("child_removed", removeWhiteboard);

  function updateTitle(e) {
    let data = e.val();
    document.querySelector("h1").textContent = "Writeboard (Host): " + data;
  }

  function addWhiteboard(e) {
    let whiteboards = document.querySelector("div.whiteboards");

    let userNode = document.createElement("div");
    let userWhiteboard = document.createElement("img");
    let userName = document.createElement("span");

    userWhiteboard.src = e.val().board;
    userName.textContent = e.val().name;
    userNode.id = snakeCase(e.val().name);

    userNode.appendChild(userWhiteboard);
    userNode.appendChild(userName);
    whiteboards.appendChild(userNode);

    console.log("Added whiteboard");
  }

  function updateWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${snakeCase(e.val().name)}`);
    userNode.querySelector("img").src = e.val().board;
    userNode.querySelector("span").textContent = e.val().name;

    console.log("Updated whiteboard");
  }

  function removeWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${snakeCase(e.val().name)}`);
    userNode.remove();
  }

  const snakeCase = string => {
    return string.replace(/\W+/g, " ")
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  };
}