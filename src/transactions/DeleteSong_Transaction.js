import jsTPS_Transaction from "../common/jsTPS.js"
export default class DeleteSong_Transaction extends jsTPS_Transaction {
    constructor(initApp,initIndex,InitSong){
        super();
        this.app = initApp;
        this.index = initIndex;
        this.song = InitSong;
    }
    doTransaction(){
        this.app.deleteSongTransaction();
    }
    undoTransaction(){
       this.app.addNewSongAt(this.index,this.song);
    }
}