import React from 'react';
import './App.css';

// IMPORT DATA MANAGEMENT AND TRANSACTION STUFF
import DBManager from './db/DBManager';
import jsTPS from './common/jsTPS.js';
// OUR TRANSACTIONS
import MoveSong_Transaction from './transactions/MoveSong_Transaction.js';
import AddSong_Transaction from './transactions/AddSong_Transaction.js';
import DeleteSong_Transaction from './transactions/DeleteSong_Transaction.js';
import EditSong_Transaction from './transactions/EditSong_Transaction.js';

// THESE REACT COMPONENTS ARE MODALS
import DeleteListModal from './components/DeleteListModal.js';
import DeleteSongModal from './components/DeleteSongModal.js';
import EditSongModal from './components/EditSongModal.js';


// THESE REACT COMPONENTS ARE IN OUR UI
import Banner from './components/Banner.js';
import EditToolbar from './components/EditToolbar.js';
import PlaylistCards from './components/PlaylistCards.js';
import SidebarHeading from './components/SidebarHeading.js';
import SidebarList from './components/SidebarList.js';
import Statusbar from './components/Statusbar.js';

class App extends React.Component {
    constructor(props) {
        super(props);
    
        // THIS IS OUR TRANSACTION PROCESSING SYSTEM
        this.tps = new jsTPS();

        // THIS WILL TALK TO LOCAL STORAGE
        this.db = new DBManager();

        // GET THE SESSION DATA FROM OUR DATA MANAGER
        let loadedSessionData = this.db.queryGetSessionData();

        // SETUP THE INITIAL STATE
        this.state = {
            listKeyPairMarkedForDeletion : null,
            currentList : null,
            sessionData : loadedSessionData,
            SongNameMarkedForDeletion : null,
            SongIndexMarkedForDeletion: -1,
            SongIndexMarkedForEdition: -1

        }
    }
    sortKeyNamePairsByName = (keyNamePairs) => {
        keyNamePairs.sort((keyPair1, keyPair2) => {
            // GET THE LISTS
            return keyPair1.name.localeCompare(keyPair2.name);
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF CREATING A NEW LIST
    createNewList = () => {
        // FIRST FIGURE OUT WHAT THE NEW LIST'S KEY AND NAME WILL BE
        let newKey = this.state.sessionData.nextKey;
        let newName = "Untitled" + newKey;

        // MAKE THE NEW LIST
        let newList = {
            key: newKey,
            name: newName,
            songs: []
        };

        // MAKE THE KEY,NAME OBJECT SO WE CAN KEEP IT IN OUR
        // SESSION DATA SO IT WILL BE IN OUR LIST OF LISTS
        let newKeyNamePair = { "key": newKey, "name": newName };
        let updatedPairs = [...this.state.sessionData.keyNamePairs, newKeyNamePair];
        this.sortKeyNamePairsByName(updatedPairs);

        // CHANGE THE APP STATE SO THAT THE CURRENT LIST IS
        // THIS NEW LIST AND UPDATE THE SESSION DATA SO THAT THE
        // NEXT LIST CAN BE MADE AS WELL. NOTE, THIS setState WILL
        // FORCE A CALL TO render, BUT THIS UPDATE IS ASYNCHRONOUS,
        // SO ANY AFTER EFFECTS THAT NEED TO USE THIS UPDATED STATE
        // SHOULD BE DONE VIA ITS CALLBACK
        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : prevState.listKeyPairMarkedForDeletion,
            currentList: newList,
            sessionData: {
                nextKey: prevState.sessionData.nextKey + 1,
                counter: prevState.sessionData.counter + 1,
                keyNamePairs: updatedPairs
            }
        }), () => {
            // PUTTING THIS NEW LIST IN PERMANENT STORAGE
            // IS AN AFTER EFFECT
            this.db.mutationCreateList(newList);

            // SO IS STORING OUR SESSION DATA
            this.db.mutationUpdateSessionData(this.state.sessionData);
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF DELETING A LIST.
    deleteList = (key) => {
        // IF IT IS THE CURRENT LIST, CHANGE THAT
        let newCurrentList = null;
        if (this.state.currentList) {
            if (this.state.currentList.key !== key) {
                // THIS JUST MEANS IT'S NOT THE CURRENT LIST BEING
                // DELETED SO WE'LL KEEP THE CURRENT LIST AS IT IS
                newCurrentList = this.state.currentList;
            }
        }

        let keyIndex = this.state.sessionData.keyNamePairs.findIndex((keyNamePair) => {
            return (keyNamePair.key === key);
        });
        let newKeyNamePairs = [...this.state.sessionData.keyNamePairs];
        if (keyIndex >= 0)
            newKeyNamePairs.splice(keyIndex, 1);

        // AND FROM OUR APP STATE
        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : null,
            currentList: newCurrentList,
            sessionData: {
                nextKey: prevState.sessionData.nextKey,
                counter: prevState.sessionData.counter - 1,
                keyNamePairs: newKeyNamePairs
            }
        }), () => {
            // DELETING THE LIST FROM PERMANENT STORAGE
            // IS AN AFTER EFFECT
            this.db.mutationDeleteList(key);

            // SO IS STORING OUR SESSION DATA
            this.db.mutationUpdateSessionData(this.state.sessionData);
        });
    }
    deleteMarkedList = () => {
        this.deleteList(this.state.listKeyPairMarkedForDeletion.key);
        this.hideDeleteListModal();
    }
    // THIS FUNCTION SPECIFICALLY DELETES THE CURRENT LIST
    deleteCurrentList = () => {
        if (this.state.currentList) {
            this.deleteList(this.state.currentList.key);
        }
    }
    renameList = (key, newName) => {
        let newKeyNamePairs = [...this.state.sessionData.keyNamePairs];
        // NOW GO THROUGH THE ARRAY AND FIND THE ONE TO RENAME
        for (let i = 0; i < newKeyNamePairs.length; i++) {
            let pair = newKeyNamePairs[i];
            if (pair.key === key) {
                pair.name = newName;
            }
        }
        this.sortKeyNamePairsByName(newKeyNamePairs);

        // WE MAY HAVE TO RENAME THE currentList
        let currentList = this.state.currentList;
        if (currentList.key === key) {
            currentList.name = newName;
        }

        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : null,
            sessionData: {
                nextKey: prevState.sessionData.nextKey,
                counter: prevState.sessionData.counter,
                keyNamePairs: newKeyNamePairs
            }
        }), () => {
            // AN AFTER EFFECT IS THAT WE NEED TO MAKE SURE
            // THE TRANSACTION STACK IS CLEARED
            let list = this.db.queryGetList(key);
            list.name = newName;
            this.db.mutationUpdateList(list);
            this.db.mutationUpdateSessionData(this.state.sessionData);
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF LOADING A LIST FOR EDITING
    loadList = (key) => {
        let newCurrentList = this.db.queryGetList(key);
        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : prevState.listKeyPairMarkedForDeletion,
            currentList: newCurrentList,
            sessionData: this.state.sessionData
        }), () => {
            // AN AFTER EFFECT IS THAT WE NEED TO MAKE SURE
            // THE TRANSACTION STACK IS CLEARED
            this.tps.clearAllTransactions();
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF CLOSING THE CURRENT LIST
    closeCurrentList = () => {
        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : prevState.listKeyPairMarkedForDeletion,
            currentList: null,
            sessionData: this.state.sessionData
        }), () => {
            // AN AFTER EFFECT IS THAT WE NEED TO MAKE SURE
            // THE TRANSACTION STACK IS CLEARED
            this.tps.clearAllTransactions();
        });
    }
    setStateWithUpdatedList(list) {
        this.setState(prevState => ({
            listKeyPairMarkedForDeletion : prevState.listKeyPairMarkedForDeletion,
            currentList : list,
            sessionData : this.state.sessionData
        }), () => {
            // UPDATING THE LIST IN PERMANENT STORAGE
            // IS AN AFTER EFFECT
            this.db.mutationUpdateList(this.state.currentList);
        });
    }
    getPlaylistSize = () => {
        return this.state.currentList.songs.length;
    }
    // THIS FUNCTION MOVES A SONG IN THE CURRENT LIST FROM
    // start TO end AND ADJUSTS ALL OTHER ITEMS ACCORDINGLY
    moveSong(start, end) {
        let list = this.state.currentList;

        // WE NEED TO UPDATE THE STATE FOR THE APP
        start -= 1;
        end -= 1;
        if (start < end) {
            let temp = list.songs[start];
            for (let i = start; i < end; i++) {
                list.songs[i] = list.songs[i + 1];
            }
            list.songs[end] = temp;
        }
        else if (start > end) {
            let temp = list.songs[start];
            for (let i = start; i > end; i--) {
                list.songs[i] = list.songs[i - 1];
            }
            list.songs[end] = temp;
        }
        this.setStateWithUpdatedList(list);
    }
    
    
    // THIS FUNCTION ADDS A MoveSong_Transaction TO THE TRANSACTION STACK
    addMoveSongTransaction = (start, end) => {
        let transaction = new MoveSong_Transaction(this, start, end);
        this.tps.addTransaction(transaction);
    }
    addAddSongTransaction = ()=>{
        let transaction = new AddSong_Transaction(this);
        this.tps.addTransaction(transaction);
    }
    addDeleteSongTransaction = () =>{
        let transaction  = new DeleteSong_Transaction(this,this.state.SongIndexMarkedForDeletion,this.state.currentList.songs[this.state.SongIndexMarkedForDeletion]);
        this.tps.addTransaction(transaction);
    }
    addEditSongTransaction = () =>{
        let index = this.state.SongIndexMarkedForEdition;
        let song = this.state.currentList.songs[index];
        let newtitle = document.getElementById("edit-song-title").value;
        let newartist = document.getElementById("edit-song-artist").value; 
        let newyoutubeid = document.getElementById("edit-song-youTubeId").value;
        let transaction = new EditSong_Transaction(this,index,song,newtitle,newartist,newyoutubeid);
        this.tps.addTransaction(transaction);
    }


    // THIS FUNCTION BEGINS THE PROCESS OF PERFORMING AN UNDO
    undo = () => {
        if (this.tps.hasTransactionToUndo()) {
            this.tps.undoTransaction();

            // MAKE SURE THE LIST GETS PERMANENTLY UPDATED
            this.db.mutationUpdateList(this.state.currentList);
        }
    }
    // THIS FUNCTION BEGINS THE PROCESS OF PERFORMING A REDO
    redo = () => {
        if (this.tps.hasTransactionToRedo()) {
            this.tps.doTransaction();

            // MAKE SURE THE LIST GETS PERMANENTLY UPDATED
            this.db.mutationUpdateList(this.state.currentList);
        }
    }
    
    
    editsong = (index,title,artist,youTubeId) =>{
        let song = this.state.currentList.songs[index];
        song.title = title;
        song.artist = artist;
        song.youTubeId = youTubeId;
        this.setStateWithUpdatedList(this.state.currentList);
        this.hideEditSongModal();
    }
    
    markSongForEdition = (index) =>{
        let song = this.state.currentList.songs[index];
        let oldtitle = song.title;
        let oldartist = song.artist;
        let oldyoutubeId = song.youTubeId;
        document.getElementById("edit-song-title").value = oldtitle;
        document.getElementById("edit-song-artist").value = oldartist;
        document.getElementById("edit-song-youTubeId").value = oldyoutubeId;
        this.setState(prevState => ({
            SongIndexMarkedForEdition : index,
            sessionData:prevState.sessionData
        }),
        () => {
            this.showEditSongModal();
        });
    }
    markSongForDeletion = (index) =>{
        let title = this.state.currentList.songs[index].title;
        this.setState(prevState => ({
            SongNameMarkedForDeletion : title,
            SongIndexMarkedForDeletion: index,
            sessionData: prevState.sessionData
        }), () => {
            // PROMPT THE USER
            // this.showDeleteSongModal();
        });
    }
    markListForDeletion = (keyPair) => {
        this.setState(prevState => ({
            currentList: prevState.currentList,
            listKeyPairMarkedForDeletion : keyPair,
            sessionData: prevState.sessionData
        }), () => {
            // PROMPT THE USER
            this.showDeleteListModal();
        });
    }
    
    
    deleteSongTransaction = () =>{
        this.deleteSong(this.state.SongIndexMarkedForDeletion);
    }

    addNewSongAt  = (initIndex,InitSong) =>{
        this.state.currentList.songs.splice(initIndex,0,InitSong);
        this.setStateWithUpdatedList(this.state.currentList);
    }
    addNewSong = ()=>{
        let newSong = {"title":"untitled" ,"artist":"unknown","youTubeId":"dQw4w9WgXcQ"};
        this.state.currentList.songs.push(newSong);
        this.setStateWithUpdatedList(this.state.currentList);
    }

    removeLastSong = ()=>{
        this.state.currentList.songs.pop();
        this.setStateWithUpdatedList(this.state.currentList);
    }

    deleteSong = (index) =>{
        this.state.currentList.songs.splice(index,1);
        this.setStateWithUpdatedList(this.state.currentList);
        this.hideDeleteSongModal();
    }
    
    
    showEditSongModal = ()=>{
        let modal = document.getElementById("edit-song-modal");
        modal.classList.add("is-visible");
    }
    hideEditSongModal = ()=>{
        console.log("inside hideEditSongModal")
        let modal = document.getElementById("edit-song-modal");
        modal.classList.remove("is-visible");
    }
    // showDeleteSongModal=()=> {
    //     let modal = document.getElementById("delete-song-modal");
    //     modal.classList.add("is-visible");
    // }
    // // THIS FUNCTION IS FOR HIDING THE MODAL
    // hideDeleteSongModal = ()=> {
    //     let modal = document.getElementById("delete-song-modal");
    //     modal.classList.remove("is-visible");
    // }

    keydownHandler = (event) => {
        if(event.keyCode === 90 && (event.ctrlKey||event.metaKey)){
            this.undo();
        }
        else if(event.keyCode === 89 && (event.ctrlkey||event.metaKey)){
            this.redo();
        }
    }
   
    
    showDeleteListModal() {
        let modal = document.getElementById("delete-list-modal");
        modal.classList.add("is-visible");
    }
    // THIS FUNCTION IS FOR HIDING THE MODAL
    hideDeleteListModal() {
        let modal = document.getElementById("delete-list-modal");
        modal.classList.remove("is-visible");
    }


    render() {
        let canAddSong = this.state.currentList !== null;
        let canUndo = this.tps.hasTransactionToUndo();
        let canRedo = this.tps.hasTransactionToRedo();
        let canClose = this.state.currentList !== null;
        let canAddlist = this.state.currentList !== null;
        console.log(canAddlist)
        return (
            <div id="root" onKeyDown = {this.keydownHandler}>
                <Banner />
                <SidebarHeading
                    createNewListCallback={this.createNewList}
                    canAddlist = {canAddlist}
                />
                <SidebarList
                    currentList={this.state.currentList}
                    keyNamePairs={this.state.sessionData.keyNamePairs}
                    deleteListCallback={this.markListForDeletion}
                    loadListCallback={this.loadList}
                    renameListCallback={this.renameList}
                />
                <EditToolbar
                    canAddSong={canAddSong}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    canClose={canClose} 
                    undoCallback={this.undo}
                    redoCallback={this.redo}
                    closeCallback={this.closeCurrentList}
                    addSongCallback = {this.addAddSongTransaction}
                />
                <PlaylistCards
                    currentList={this.state.currentList}
                    moveSongCallback={this.addMoveSongTransaction} 
                    deleteSongCallback = {this.markSongForDeletion}
                    editSongCallback = {this.markSongForEdition}
                    />
                <Statusbar 
                    currentList={this.state.currentList} />
                <DeleteListModal
                    listKeyPair={this.state.listKeyPairMarkedForDeletion}
                    hideDeleteListModalCallback={this.hideDeleteListModal}
                    deleteListCallback={this.deleteMarkedList}
                
                />
                {/* <DeleteSongModal
                    hideDeleteSongModalCallback={this.hideDeleteSongModal}
                    SongNameMarkedForDeletion={this.state.SongNameMarkedForDeletion}
                    deleteSongCallback = {this.addDeleteSongTransaction}
                /> */}
                <EditSongModal
                hideEditSongModalCallback = {this.hideEditSongModal}
                editSongCallback = {this.addEditSongTransaction}
                />
                
            </div>
        );
    }

}
export default App;
