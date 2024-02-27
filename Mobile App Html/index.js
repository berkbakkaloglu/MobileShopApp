import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import { getDatabase, ref , push , onValue, remove} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js"

const appSettings = {
    databaseURL : "https://playground-644c5-default-rtdb.europe-west1.firebasedatabase.app/"
}

const app = initializeApp(appSettings)
const database = getDatabase(app)
const shoppingListInDb = ref(database, "shoplist")


const inputFieldEl = document.getElementById("input-field")
const addButtonEl = document.getElementById("add-button")
const shoppinglistEl = document.getElementById("shopping-list")

addButtonEl.addEventListener("click", function(){

    let inputValue = inputFieldEl.value
    push(shoppingListInDb , inputValue)   
    
    clearInput(inputFieldEl)
    
    
    
})

onValue(shoppingListInDb, function(snapshot) {
    
    if (snapshot.exists()) {

        let itemsArray = Object.entries(snapshot.val())
    
        clearShoppingListEl()

        for (let i=0; i<itemsArray.length; i++){
        let currentItem = itemsArray[i]
        let currentItemID = currentItem[0]
        let currentItemValue = currentItem[1]
        appendItem(currentItem)
        }  
    } else {
        shoppinglistEl.innerHTML = "No items here... yet"
    }


})
function clearShoppingListEl() {
    shoppinglistEl.innerHTML = ""

}

function clearInput(a){
    a.value = ""
}

function appendItem(item){
    
    let itemId = item[0]
    let itemValue = item[1]
    
  let newEL = document.createElement("li")
  newEL.textContent = itemValue  

  newEL.addEventListener("click",function(){
    let exactLocationOfItemInDb = ref(database, `shoplist/${itemId}`)
    remove(exactLocationOfItemInDb)
  })
  shoppinglistEl.append(newEL)
    
}





