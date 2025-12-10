import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Workspace, Project } from '../../data.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
    selector: 'app-workspaces',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './workspaces.component.html',
    styleUrl: './workspaces.component.css'
})
export class WorkspacesComponent {
    protected readonly workspaces = signal<Workspace[]>([]);
    protected readonly projects = signal<Project[]>([]);
    protected readonly showCreateModal = signal(false);
    protected readonly showEditModal = signal(false);
    protected readonly showEmojiPickerCreate = signal(false);
    protected readonly showEmojiPickerEdit = signal(false);
    protected readonly newWorkspace = signal({
        name: '',
        description: '',
        color: '#22d3ee',
        icon: ''
    });
    protected readonly editWorkspace = signal<Workspace | null>(null);

    protected readonly availableEmojis = [
        '📁', '📂', '🗂️', '📊', '📈', '📉', '💼', '🏢',
        '🎯', '🚀', '⚡', '🔥', '💡', '🎨', '🔧', '⚙️',
        '🌟', '✨', '💻', '📱', '🖥️', '⌨️', '🖱️', '🎮',
        '📝', '📋', '📌', '📍', '🔖', '🏷️', '💾', '📀'
    ];

    constructor(private dataService: DataService) {
        this.loadWorkspaces();
        this.loadProjects();
    }

    private loadWorkspaces() {
        this.dataService.getWorkspaces().subscribe({
            next: (workspaces) => this.workspaces.set(workspaces),
            error: (err) => console.error('Error loading workspaces', err)
        });
    }

    private loadProjects() {
        this.dataService.getProjects().subscribe({
            next: (projects) => this.projects.set(projects),
            error: (err) => console.error('Error loading projects', err)
        });
    }

    protected openCreateModal() {
        this.newWorkspace.set({
            name: '',
            description: '',
            color: '#22d3ee',
            icon: ''
        });
        this.showCreateModal.set(true);
    }

    protected createWorkspace() {
        const data = this.newWorkspace();
        if (!data.name) return;

        this.dataService.createWorkspace(data).subscribe({
            next: (workspace) => {
                this.workspaces.update(ws => [...ws, workspace]);
                this.showCreateModal.set(false);
            },
            error: (err) => console.error('Error creating workspace', err)
        });
    }

    protected openEditModal(workspace: Workspace) {
        this.editWorkspace.set({ ...workspace });
        this.showEditModal.set(true);
    }

    protected updateWorkspace() {
        const workspace = this.editWorkspace();
        if (!workspace || !workspace.name) return;

        this.dataService.updateWorkspace(workspace.id, {
            name: workspace.name,
            description: workspace.description,
            color: workspace.color,
            icon: workspace.icon
        }).subscribe({
            next: (updated) => {
                this.workspaces.update(ws =>
                    ws.map(w => w.id === updated.id ? updated : w)
                );
                this.showEditModal.set(false);
            },
            error: (err) => console.error('Error updating workspace', err)
        });
    }

    protected deleteWorkspace(workspace: Workspace) {
        if (!confirm(`¿Estás seguro de eliminar el espacio "${workspace.name}"?`)) {
            return;
        }

        this.dataService.deleteWorkspace(workspace.id).subscribe({
            next: () => {
                this.workspaces.update(ws => ws.filter(w => w.id !== workspace.id));
            },
            error: (err) => {
                console.error('Error deleting workspace', err);
                alert('No se puede eliminar un espacio que contiene proyectos');
            }
        });
    }

    protected selectEmoji(emoji: string, isEdit: boolean = false) {
        if (isEdit) {
            const current = this.editWorkspace();
            if (current) {
                this.editWorkspace.set({ ...current, icon: emoji });
            }
            this.showEmojiPickerEdit.set(false);
        } else {
            this.newWorkspace.update(ws => ({ ...ws, icon: emoji }));
            this.showEmojiPickerCreate.set(false);
        }
    }

    protected getProjectCount(workspaceId: string): number {
        return this.projects().filter(p => p.workspaceId === workspaceId).length;
    }
}
