import { AfterViewInit, Component, OnInit, ViewChild, Input } from '@angular/core';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';
import * as Hammer from 'hammerjs';
import { AppService } from '../app.service';
import { AnnotationFile } from '../models/annotation-file.model';
import { Region } from '../models/region.model';
import { Mask } from '../models/mask.model';
import { DicomFile } from '../models/dicom-file.model';
import { Observable, combineLatest } from 'rxjs';
import { MatSelect } from '@angular/material/select';

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

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

    public regions: Region[];
    public masks: Mask[] = [];

    public timerId;

    private selectedRegionIds: number[] = [];
    private currentDicom = this.dicomFiles[0];

    private imageAnnotations = {};

    private mainLayerId: string;

    private currentLayerId: string;

    constructor(
        private appService: AppService
    ) { }

    ngOnInit(): void {
        this.currentDicom = this.dicomFiles[0];
        this.dicomImage.nativeElement.addEventListener('cornerstoneimagerendered', (e) => {
            cornerstone.setToPixelCoordinateSystem(e.detail.enabledElement, e.detail.canvasContext);
            if (!this.imageAnnotations) {
                return;
            }

            const context = e.detail.canvasContext;

            this.regions = (this.imageAnnotations[Object.entries(this.imageAnnotations)[0][0]] as AnnotationFile).regions;
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

        this.imageAnnotations = this.appService.getAnnotationsFromFile(this.currentDicom.annotationFile).subscribe(imageAnnotations => {
            this.imageAnnotations = imageAnnotations
        });
        this.masks = this.currentDicom.maskFiles.map(mf => ({ filename: mf.name, name: mf.name }) as Mask);
    }

    ngAfterViewInit(): void {
        cornerstoneTools.init({
            showSVGCursors: true
        });

        cornerstone.enable(this.dicomImage.nativeElement);

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
        if (this.currentLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentLayerId);
        }
        if (!event.value) {
            cornerstone.updateImage(this.dicomImage.nativeElement);
            return;
        }
        const maskFile = this.currentDicom.maskFiles.find(mf => mf.name === event.value)
        this.appService.getLayerImage(maskFile)
            .subscribe(image => {
                this.currentLayerId = cornerstone.addLayer(this.dicomImage.nativeElement, image, {
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
        if (this.currentLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentLayerId);
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
        if (this.currentLayerId) {
            cornerstone.removeLayer(this.dicomImage.nativeElement, this.currentLayerId);
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
        this.timerId = setInterval(() => this.nextImage(), 2000);
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
        combineLatest(annotations$, loadImage$).subscribe(([annotations, image]) => {
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