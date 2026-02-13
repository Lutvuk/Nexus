import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class MarkdownPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);

    async transform(value: string | undefined): Promise<SafeHtml> {
        if (!value) return '';
        const html = await marked.parse(value);
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
