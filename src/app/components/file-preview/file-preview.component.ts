import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-preview.component.html',
  styleUrl: './file-preview.component.css'
})
export class FilePreviewComponent {
  @Input() fileUrl: string = '';
  @Input() fileName: string = '';
  @Input() fileType: string = '';
  @Output() close = new EventEmitter<void>();

  constructor(private sanitizer: DomSanitizer) {}

  protected get isImage(): boolean {
    return this.fileType.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(this.fileName);
  }

  protected get isPDF(): boolean {
    return this.fileType === 'application/pdf' ||
           this.fileName.toLowerCase().endsWith('.pdf');
  }

  protected get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl);
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected downloadFile(): void {
    const link = document.createElement('a');
    link.href = this.fileUrl;
    link.download = this.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
