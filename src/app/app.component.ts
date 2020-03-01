import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    public files: any[];

    constructor() {}

    public dicomUploaded(files) {
        this.files = files;
    }
}
