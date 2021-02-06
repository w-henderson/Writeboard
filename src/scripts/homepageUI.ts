var Swal: any;
var firebase: any;

namespace UI {
  var database = firebase.database();

  function route(r: string) {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "192.168.1.1") return r;
    else return `${r}.html`;
  }

  export function scrollToAnchor(name: string) {
    document.querySelector(".navigation").className = "navigation";
    document.querySelector(`a[name="${name}"]`).scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, null, `#${name}`);
  }

  export function joinRoom() {
    Swal.fire({
      title: 'Enter the room ID.',
      text: "Ask the room host if you don't know the room ID.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Join',
      background: "var(--background)",
      showLoaderOnConfirm: true,
      allowOutsideClick: true,
      preConfirm: (id: string) => {
        let regex = new RegExp("^[a-zA-Z]{6}$")
        if (!regex.test(id)) {
          Swal.showValidationMessage("Room ID should be six letters.");
          return false;
        } else {
          return id.toUpperCase();
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let roomId = result.value;
        window.location.href = `/${route("client")}?${roomId}`;
      }
    });
  }

  export async function hostRoom() {
    Swal.fire({
      title: 'Name your room.',
      text: "This will appear at the top of your screen along with the room code.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Create',
      background: "var(--background)",
      allowOutsideClick: true,
      preConfirm: (name: string) => {
        if (name.length === 0) {
          Swal.showValidationMessage("You must name your room!");
          return false;
        } else {
          return name;
        }
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        let roomName = result.value;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let valid = false;

        let code = "";
        for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];

        while (!valid) {
          await database.ref(`rooms/${code}`).once("value", (snapshot) => {
            if (snapshot.val() === null) {
              valid = true;
            } else {
              code = "";
              for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];
            }
          });
        }

        database.ref(`rooms/${code}`).set({
          name: roomName,
          users: {}
        }).then(() => {
          window.localStorage.setItem("writeboardTempId", code);
          window.location.href = "/" + route("host");
        }).catch(() => {
          Swal.fire({
            title: "An error occurred.",
            icon: "error",
            background: "var(--background)"
          });
        });
      }
    });
  }

  export function privacy() {
    Swal.fire({
      icon: "info",
      width: 800,
      title: "Our Privacy Policy",
      html: `Here at Writeboard, we're committed to your privacy, which is why this privacy policy aims to be as transparent as possible.
      All the data we collect is for the sole purpose of improving Writeboard, and we never share any data with any third parties.
      <h2>What data do we collect?</h2>
        <ul>
          <li>Device information such as OS, model etc</li>
          <li>Browser information such as name, version, screen resolution etc</li>
          <li>Mode of input such as pen, touch, mouse etc</li>
          <li>When and how often you create, join, leave, or close a room</li>
          <li>Vague location estimated by Google, not personally identifiable</li>
        </ul>
      <h2>What data don't we collect?</h2>
      <ul>
        <li>Any personally-identifiable data</li>
        <li>IP addresses</li>
      </ul>`,
      confirmButtonText: "Close",
      background: "var(--background)"
    })
  }

  function updateSizing() {
    let height = (window.visualViewport.width * 0.176) + 170; // it works, don't mess it up
    (<HTMLDivElement>document.querySelector("div.banner")).style.height = `${height}px`;
    document.querySelectorAll("div.banner img").forEach((div) => {
      (<HTMLDivElement>div).style.height = `${height}px`;
      (<HTMLDivElement>div).style.left = `calc(50% - ${height * 2}px)`;
    });
  }

  function updateLatestUpdates() {
    let updateList: HTMLUListElement = document.querySelector("#updateList");

    window.fetch("https://api.github.com/repos/w-henderson/Writeboard/commits")
      .then(data => {
        if (data.ok) return data.json();
        else {
          updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
          firebase.analytics().logEvent("latestUpdatesError", { "errorType": "404" });
          return false;
        }
      })
      .then(data => {
        if (!data) return;
        updateList.innerHTML = "";

        for (let commit of data) {
          let commitMessage: string = commit.commit.message;
          if (commitMessage.substr(0, 20) === "Merge pull request #") continue; // Ignore merge commits
          else commitMessage = commitMessage.split("\n")[0];

          let commitDate = new Date(commit.commit.author.date);
          let commitDateString = commitDate.toLocaleDateString() + ": ";

          let li = document.createElement("li");
          let a = document.createElement("a");
          let date = document.createTextNode(commitDateString);
          a.href = commit.html_url;
          a.target = "_blank";
          a.textContent = commitMessage;
          li.appendChild(date);
          li.appendChild(a);
          updateList.appendChild(li);

          if (updateList.childElementCount === 5) return;
        }
      })
      .catch((e) => {
        updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
        firebase.analytics().logEvent("latestUpdatesError", { errorType: "unknown" });
      });
  }

  window.onresize = updateSizing;
  window.onload = () => {
    updateSizing();
    updateLatestUpdates();
  };
}