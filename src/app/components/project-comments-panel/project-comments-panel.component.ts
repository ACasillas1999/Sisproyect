import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Project, ProjectComment } from '../../data.service';

@Component({
  selector: 'app-project-comments-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-comments-panel.component.html',
  styleUrl: './project-comments-panel.component.css',
})
export class ProjectCommentsPanelComponent {
  @Input() open = false;
  @Input() project: Project | null = null;
  @Input() comments: ProjectComment[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() draft = '';

  @Output() closed = new EventEmitter<void>();
  @Output() draftChange = new EventEmitter<string>();
  @Output() submit = new EventEmitter<void>();
}
