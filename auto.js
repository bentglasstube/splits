function AutoSplit() {
    this.lastModified = 0;
    this.size = 0;
    this.file = null;

    this.setFile = function(file_elem) {
        var elem = document.getElementById(file_elem);
        this.file = elem.files[0]
        this.lastModified = this.file.lastModified;
        this.size = this.file.size;
    }

    this.checkUpdate = function(cb) {
        if (this.file == null)
            return;

        if (this.lastModified != this.file.lastModified ||
            this.size != this.file.size) {
            reader = new FileReader();
            reader.addEventListener("loadend", function() {
                try {
                    cb(JSON.parse(reader.result));
                } catch (ex) {
                    console.log('Error parsing autosplit file');
                }
            });
            reader.readAsText(this.file);
            this.lastModified = this.file.lastModified;
            this.size = this.file.size;
        }
    }
}
