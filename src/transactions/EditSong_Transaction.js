import jsTPS_Transaction from "../common/jsTPS.js"
export default class EditSong_Transaction extends jsTPS_Transaction  {
    constructor(initApp,initIndex,oldSong,initTitle,initArtist,initYoutubeId){
        super();
        this.app = initApp;
        this.index = initIndex;
        this.song = oldSong;
        this.title = initTitle;
        this.artist = initArtist;
        this.youtubeid = initYoutubeId;
        this.oldTitle = oldSong.title;
        this.oldArtist = oldSong.artist;
        this.oldyoutubeid = oldSong.youTubeId;

    }
    doTransaction(){
       this.app.editsong(this.index,this.title,this.artist,this.youtubeid);
    }
    undoTransaction(){
        this.app.editsong(this.index,this.oldTitle,this.oldArtist,this.oldyoutubeid);
    }
}