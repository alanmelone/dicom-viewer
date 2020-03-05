import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import { combineLatest } from 'rxjs';

import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSelect } from '@angular/material/select';

import { AppService } from '../app.service';
import { AnnotationFile } from '../models/annotation-file.model';
import { DicomFile } from '../models/dicom-file.model';
import { Mask } from '../models/mask.model';
import { Region } from '../models/region.model';

@Component({
    selector: 'ia-image-control',
    templateUrl: './image-control.component.html',
    styleUrls: ['./image-control.component.scss']
})
export class ImageControlComponent implements OnInit, AfterViewInit {
    @ViewChild('layerSelect')
    private layerSelect: MatSelect;

    @ViewChild('dicomImage', { static: true })
    private dicomImage: any;

    @Input()
    public dicomFiles: DicomFile[] = [];

    public regions: Region[] = [];
    public masks: Mask[] = [];

    public timerId;

    private selectedRegionIds: number[] = [];
    private currentDicom: DicomFile;

    private imageAnnotations = {};

    private mainLayerId: string;

    private currentMaskLayerId: string;

    constructor(
        private appService: AppService
    ) { }

    ngOnInit(): void {
        this.currentDicom = this.dicomFiles[0];
        this.dicomImage.nativeElement.addEventListener('cornerstoneimagerendered', (e) => {
            cornerstone.setToPixelCoordinateSystem(e.detail.enabledElement, e.detail.canvasContext);

            this.regions = [];

            if (this.imageAnnotations === undefined || Object.entries(this.imageAnnotations)[0] === undefined) {
                return;
            }

            const context = e.detail.canvasContext;
            const annotationFile = this.imageAnnotations[Object.entries(this.imageAnnotations)[0][0]] as AnnotationFile;

                this.regions = annotationFile.regions;
                this.regions.forEach((r, index) => {
                    if (this.selectedRegionIds.includes(index)) {
                        const xCoords = r.shape_attributes.all_points_x;
                        const yCoords = r.shape_attributes.all_points_y;

                        context.beginPath();
                        context.moveTo(xCoords[0], yCoords[0]);
                        for (let i = 1; i < xCoords.length; i++) {
                            context.lineTo(xCoords[i], yCoords[i]);
                        }
                        context.closePath();
                        context.fillStyle = 'rgba(255, 0, 0, 0.4)'
                        context.fill();
                    }
                })
        });


        this.appService.getAnnotationsFromFile(this.currentDicom.annotationFile).subscribe(imageAnnotations => {
            this.imageAnnotations = imageAnnotations
        });
        this.masks = this.currentDicom.maskFiles.map(mf => ({ filename: mf.name, name: mf.name }) as Mask);
    }

    ngAfterViewInit(): void {
        cornerstoneTools.init({
            showSVGCursors: true
        });

        cornerstone.enable(this.dicomImage.nativeElement, {
            render: 'webgl'
        });

        this.appService.getFile(this.currentDicom.dicomFile).subscribe(image => {
            this.displayImage(image);

            const PanTool = cornerstoneTools.PanTool;
            const ZoomMouseWheelTool = cornerstoneTools.ZoomMouseWheelTool;
            cornerstoneTools.addTool(PanTool);
            cornerstoneTools.addTool(ZoomMouseWheelTool);
            cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
            cornerstoneTools.setToolActive('ZoomMouseWheel', { mouseButtonMask: 1 })
        })
    }

    changeLayer(event) {
        if (this.currentMaskLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentMaskLayerId);
        }
        if (!event.value) {
            cornerstone.updateImage(this.dicomImage.nativeElement);
            return;
        }
        const maskFile = this.currentDicom.maskFiles.find(mf => mf.name === event.value)
        this.appService.getLayerImage(maskFile)
            .subscribe(image => {
                this.currentMaskLayerId = cornerstone.addLayer(this.dicomImage.nativeElement, image, {
                    opacity: 0.4
                })

                cornerstone.updateImage(this.dicomImage.nativeElement);
            })
    }

    changeRegion(event) {
        if (event.checked) {
            this.selectedRegionIds.push(event.source.value)
        } else {
            const indexOfElement = this.selectedRegionIds.findIndex(r => r === event.source.value);
            this.selectedRegionIds.splice(indexOfElement, 1);
        }

        this.redrawImage();
    }

    nextImage() {
        if (this.currentMaskLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentMaskLayerId);
        }

        if (this.currentDicom === this.dicomFiles[this.dicomFiles.length - 1]) {
            this.currentDicom = this.dicomFiles[0];
        } else {
            const currentNumber = this.dicomFiles.findIndex(df => df === this.currentDicom);
            this.currentDicom = this.dicomFiles[currentNumber + 1];
        }

        this.changeImage();
    }

    previousImage() {
        if (this.currentMaskLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentMaskLayerId);
        }

        if (this.currentDicom === this.dicomFiles[0]) {
            this.currentDicom = this.dicomFiles[this.dicomFiles.length - 1];
        } else {
            const currentNumber = this.dicomFiles.findIndex(df => df === this.currentDicom);
            this.currentDicom = this.dicomFiles[currentNumber - 1];
        }

        this.changeImage();
    }

    startSlideshow() {
        this.timerId = setInterval(() => this.nextImage(), 500);
    }

    stopSlideshow() {
        clearInterval(this.timerId);
        this.timerId = undefined;
    }

    private changeImage() {
        this.selectedRegionIds = [];
        this.masks = [];
        this.layerSelect.value = '';
        const loadImage$ = this.appService.getFile(this.currentDicom.dicomFile);
        const annotations$ = this.appService.getAnnotationsFromFile(this.currentDicom.annotationFile);
        combineLatest([annotations$, loadImage$]).subscribe(([annotations, image]) => {
            this.imageAnnotations = annotations;
            this.masks = this.currentDicom.maskFiles.map(mf => ({ filename: mf.name, name: mf.name }) as Mask);
            this.displayImage(image);
        });
    }

    private displayImage(image) {
        this.mainLayerId
            ? cornerstone.setLayerImage(this.dicomImage.nativeElement, image, this.mainLayerId)
            : this.mainLayerId = cornerstone.addLayer(this.dicomImage.nativeElement, image);

        cornerstone.updateImage(this.dicomImage.nativeElement);
    }

    private redrawImage() {
        cornerstone.updateImage(this.dicomImage.nativeElement);
        cornerstone.draw(this.dicomImage.nativeElement);
    }
}