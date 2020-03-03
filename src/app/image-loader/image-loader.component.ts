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
            const filename = file.name.replace(/_*[[a-z,A-Z,\s]*]*\.[^/.]+$/, '');

            const dicomFile = this.dicomFiles.find(cf => cf.filename === filename);
            if (dicomFile) {
                this.addFileToArray(dicomFile, path, file);
            } else {
                let dicomFile = new DicomFile(filename);
                dicomFile = this.addFileToArray(dicomFile, path, file);
                this.dicomFiles.push(dicomFile);
            }
        }
        this.dicomFiles.sort((a, b) => {
            return this.replaceForSort(a.filename) - this.replaceForSort(b.filename)
        })
        this.onDicomFileUploaded.emit(this.dicomFiles);
    }

    private replaceForSort(string: string): number {
        return +string.replace(/[1-9]*_/, '');
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