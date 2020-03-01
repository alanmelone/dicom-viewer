export class DicomFile {
    public filename: string;
    public dicomFile: File;
    public annotationFile: File;
    public maskFiles: File[];

    constructor(filename: string) {
        this.filename = filename;
        this.maskFiles = [];
    }
}