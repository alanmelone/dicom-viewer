import { Component, EventEmitter, Output } from '@angular/core';
import { DicomFile } from '../models/dicom-file.model';

@Component({
    selector: 'ia-image-loader',
    templateUrl: './image-loader.component.html',
    styleUrls: ['./image-loader.component.scss']
})
export class ImageLoaderComponent {

    @Output()
    public onDicomFileUploaded  = new EventEmitter<DicomFile[]>();

    private dicomFiles: DicomFile[] = [];

    constructor() {}

    public onFileUpload(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fullPath = file.webkitRelativePath.split('/');
            const path = fullPath[fullPath.length - 1];
            const filename = file.name.replace(/\.[^/.]+$/, '');

            const dicomFile = this.dicomFiles.find(cf => cf.filename.includes(filename));
            if (dicomFile) {
                this.addFileToArray(dicomFile, path, file);
            } else {
                let dicomFile = new DicomFile(filename);
                dicomFile = this.addFileToArray(dicomFile, path, file);
                this.dicomFiles.push(dicomFile);
            }
        }
        this.dicomFiles.sort((a, b) => {
            if (a.filename < b.filename) return -1;
            if (a.filename > b.filename) return 1;
            return 0;
        })
        this.onDicomFileUploaded.emit(this.dicomFiles);
    }

    private addFileToArray(dicomFile: DicomFile, path, file) {
        if (path.includes('.dcm')) {
            dicomFile.dicomFile = file;
        }
        if (path.includes('.json')) {
            dicomFile.annotationFile = file
        }
        if (path.includes('.png')) {
            dicomFile.maskFiles.push(file);
        }

        return dicomFile;
    }
}