import { Component, EventEmitter, Output } from '@angular/core';
import { DicomFile } from '../models/dicom-file.model';

@Component({
    selector: 'ia-image-loader',
    templateUrl: './image-loader.component.html',
    styleUrls: ['./image-loader.component.scss'],
})
export class ImageLoaderComponent {
    @Output()
    public fileUploaded = new EventEmitter<DicomFile[]>();

    private dicomFiles: DicomFile[] = [];

    constructor() {}

    public onFileUpload(files) {
        for (const file of files) {
            const fullPath = file.webkitRelativePath.split('/');
            const path = fullPath[fullPath.length - 1];
            const filename = file.name.replace(/_*[[a-z,A-Z,\s]*]*\.[^/.]+$/, '');

            const dicomFile = this.dicomFiles.find(cf => cf.filename === filename);
            if (dicomFile) {
                this.addFileToArray(dicomFile, path, file);
            } else {
                let newDicomFile = new DicomFile(filename);
                newDicomFile = this.addFileToArray(newDicomFile, path, file);
                this.dicomFiles.push(newDicomFile);
            }
        }
        this.dicomFiles.sort((a, b) => {
            return this.replaceForSort(a.filename) - this.replaceForSort(b.filename);
        });
        this.fileUploaded.emit(this.dicomFiles);
    }

    private replaceForSort(originalString: string): number {
        return +originalString.replace(/[1-9]*_/, '');
    }

    private addFileToArray(dicomFile: DicomFile, path, file) {
        if (path.includes('.dcm')) {
            dicomFile.dicomFile = file;
        }
        if (path.includes('.json')) {
            dicomFile.annotationFile = file;
        }
        if (path.includes('.png')) {
            dicomFile.maskFiles.push(file);
        }

        return dicomFile;
    }
}
