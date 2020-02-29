import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import * as cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import * as dicomParser from "dicom-parser";
import * as cornerstone from 'cornerstone-core'
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Annotation } from './models/annotation.model';
import { AnnotationFile } from './models/annotation-file.model';

@Injectable({ providedIn: 'root' })
export class AppService {
    constructor(private httpClient: HttpClient) {
        cornerstoneWebImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        cornerstoneWADOImageLoader.webWorkerManager.initialize({
            webWorkerPath: '/assets/cornerstone/cornerstoneWADOImageLoaderWebWorker.js',
            taskConfiguration: {
                'decodeTask': {
                    codecsPath: '/assets/cornerstone/cornerstoneWADOImageLoaderCodecs.js'
                }
            }
        });
    }

    getAnnotationForDicom(filename: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        })
        return this.httpClient.get<Map<string, AnnotationFile>>(`http://localhost:4200/assets/${filename}.json`, {headers: headers});
    }

    fetchDicomImage(filename: string): Observable<any> {
        return from(cornerstone.loadAndCacheImage(`wadouri:http://localhost:4200/assets/${filename}.dcm`));
    }

    fetchLayersImage(filenames: string[]): Observable<any[]>{
        const promises = [];
        filenames.forEach(filename => promises.push(cornerstone.loadAndCacheImage(`http://localhost:4200/assets/${filename}`)))
        return from(Promise.all(promises));
    }
}