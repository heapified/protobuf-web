
function doForm(event) {
    event.preventDefault();
    var data = new FormData();
  
    data.append("message", document.getElementById("message").value);
    for (let [key, value] of data.entries()) {
      try {
          myModule.set('name', value)
          myModule.get('name');
          // setInterval(() => {
          //     myModule.get('name');
          // }, 2000)
      } catch (error) {
          console.error(error)   
      }
    }
  }
  