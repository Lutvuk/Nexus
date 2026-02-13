import { Component, inject, signal, computed, OnInit, OnDestroy, Input, Output, EventEmitter, SimpleChanges, OnChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CardService } from '../../services/card.service';
import { BoardService } from '../../services/board.service';
import { AuthService } from '../../services/auth.service';
import { LabelPickerComponent } from '../label-picker/label-picker.component';
import { MemberPickerComponent } from '../member-picker/member-picker.component';
import { WebSocketService } from '../../services/websocket.service';
import { DialogService } from '../../services/dialog.service';
import { Card, Checklist, ChecklistItem, Label, User, Comment, Attachment, BoardTemplate, CustomField, CardCustomFieldValue, CustomFieldType } from '../../models/board.model';
import { CustomFieldService } from '../../services/custom-field.service';
import { PreferencesService } from '../../services/preferences.service';
import { toBackendUrl } from '../../core/runtime-config';
// We need Member logic. Backend returns `members` in card JSON if preloaded. 
// Frontend `Card` model needs `members?: User[]`.

// Local interface for UI state (optional, or just use Card)
interface CardDetail extends Card {
  checklists: Checklist[];
  attachments?: Attachment[];
}

import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { CardOperationModalComponent } from '../card-operation-modal/card-operation-modal.component';

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LabelPickerComponent, MemberPickerComponent, ActivityFeedComponent, MarkdownPipe, DragDropModule, CardOperationModalComponent],
  template: `
    <!-- Modal Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Glass Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-xl" (click)="closeModal()"></div>
      
      <!-- Modal Content -->
      <div class="relative z-10 w-full max-w-[1100px] h-[86vh] overflow-hidden bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        @if (isLoading()) {
          <div class="p-8 text-center text-white/60">Loading...</div>
        } @else if (card()) {
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div class="min-w-0">
              <div class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/75 mb-2.5">
                {{ $any(card()!.column)?.name || 'List' }}
              </div>
              <h2 class="text-[44px] leading-[1.05] font-bold text-white truncate">{{ card()!.title }}</h2>
            </div>
            <button (click)="closeModal()" class="relative z-50 cursor-pointer nexus-icon-btn">
              x
            </button>
          </div>

          <div class="flex flex-1 min-h-0">
          <!-- LEFT: Main Content -->
          <div class="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
                    <div class="px-6 pt-5 space-y-4">
              <div class="flex flex-wrap gap-2.5">
                <button (click)="toggleLabelPicker()" class="nexus-topbar-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m20 12-8 8-8-8 8-8 8 8Z"/></svg>
                  Labels
                </button>
                <button (click)="showDueControls.set(!showDueControls())" class="nexus-topbar-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>
                  Dates
                </button>
                <button (click)="startAddChecklist()" class="nexus-topbar-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11 11 13 15 9"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/></svg>
                  Checklist
                </button>
                <button (click)="toggleMemberPicker()" class="nexus-topbar-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
                  Members
                </button>
                <button (click)="toggleWatch()"
                        [ngClass]="isSubscribed() ? 'bg-indigo-500 text-white border-indigo-400/50' : ''"
                        class="nexus-topbar-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>{{ isSubscribed() ? 'Watching' : 'Watch' }}</span>
                </button>
              </div>

              @if (suggestionsEnabled() && showCardSuggestionHint()) {
              <div class="rounded-md border border-violet-400/30 bg-violet-500/10 text-violet-100 text-xs px-3 py-2 flex items-center justify-between gap-2">
                <span>Tip: Use Ctrl+Enter to post comments quickly and keep updates in activity.</span>
                <button (click)="dismissCardSuggestionHint()" class="text-violet-200/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">Dismiss</button>
              </div>
              <div class="flex flex-wrap gap-2">
                @if (!card()?.due_date) {
                <button (click)="showDueControls.set(true)" class="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-xs transition-colors">
                  Add due date
                </button>
                }
                @if (!card()?.checklists?.length) {
                <button (click)="startAddChecklist()" class="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-xs transition-colors">
                  Add checklist
                </button>
                }
                @if (!card()?.members?.length) {
                <button (click)="toggleMemberPicker()" class="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-xs transition-colors">
                  Assign member
                </button>
                }
              </div>
              }

             <div class="space-y-3">
                <div class="flex flex-wrap gap-3 items-center">
                  @for (label of card()!.labels; track label.id) {
                      <div class="h-6 px-2 rounded text-xs font-semibold text-white flex items-center"
                           [style.background-color]="label.color">
                          {{ label.name }}
                      </div>
                  }
                  <div class="relative">
                      @if (showLabelPicker()) {
                          <div class="absolute top-8 left-0 z-50">
                              <app-label-picker
                                  [boardId]="resolvedBoardId()"
                                  [cardId]="card()!.id"
                                  [activeLabelIds]="getLabelIds()"
                                  (close)="showLabelPicker.set(false)"
                                  (labelToggled)="onLabelToggled($event)">
                              </app-label-picker>
                          </div>
                      }
                  </div>

                  @for (member of card()!.members; track member.id) {
                      <div class="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold text-xs border-2 border-transparent hover:border-white transition-colors cursor-pointer overflow-hidden"
                           title="{{ member.name }}">
                          @if (member.avatar_url) {
                            <img [src]="resolveAvatarUrl(member.avatar_url)" class="w-full h-full object-cover" alt="Member avatar" />
                          } @else {
                            {{ member.name.charAt(0).toUpperCase() }}
                          }
                      </div>
                  }
                  <div class="relative">
                      @if (showMemberPicker()) {
                          <div class="absolute top-8 left-0 z-50">
                              <app-member-picker
                                  [boardId]="resolvedBoardId()"
                                  [cardId]="card()!.id"
                                  [activeMemberIds]="getMemberIds()"
                                  (close)="showMemberPicker.set(false)"
                                  (memberToggled)="onMemberToggled($event)">
                              </app-member-picker>
                          </div>
                      }
                  </div>
                </div>

                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  @if (showDueControls()) {
                    <div class="w-full md:w-auto rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div class="flex flex-wrap items-center gap-3">
                        <div class="flex items-center gap-2">
                          <label class="text-[11px] uppercase tracking-wider text-white/45">Due Date</label>
                          <input type="date"
                                 [value]="getDueDateValue()"
                                 (change)="updateDueDate($event)"
                                 class="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-violet-500">
                        </div>

                        <div class="h-5 w-px bg-white/10 hidden md:block"></div>

                        <label class="inline-flex items-center gap-2 text-sm text-white/80">
                          <input type="checkbox"
                                 [checked]="card()?.is_complete"
                                 (change)="toggleIsComplete($event)"
                                 class="w-4 h-4 rounded border-white/30 bg-transparent text-violet-500 focus:ring-violet-500/30">
                          Mark card as complete
                        </label>
                      </div>

                      <div class="mt-2 flex items-center gap-2 text-[11px]">
                        <span class="text-white/50">Status:</span>
                        <span class="px-1.5 py-0.5 rounded border"
                              [ngClass]="dueStatusClass()">
                          {{ dueStatusLabel() }}
                        </span>
                      </div>
                    </div>
                  }

                </div>
             </div>
          </div>
          <!-- Custom Fields -->
          <div *ngIf="customFields.length > 0" class="px-6 py-4 border-b border-white/10">
             <div class="flex items-center justify-between mb-3">
               <h3 class="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                  <span class="text-lg leading-none">CF</span> Custom Fields
               </h3>
               <span class="text-[10px] text-white/35">Update values directly here</span>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div *ngFor="let field of customFields" class="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                 <div class="flex items-center justify-between mb-1">
                   <label class="text-[10px] font-bold text-white/40 uppercase block">{{ field.name }}</label>
                   <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase">{{ field.type }}</span>
                 </div>

                 <input *ngIf="field.type === 'text'" type="text"
                    [ngModel]="getFieldValue(field.id)" (ngModelChange)="updateFieldValue(field.id, $event)"
                    class="w-full bg-transparent text-white text-sm focus:outline-none border-b border-white/10 focus:border-violet-500 placeholder-white/20 transition-colors py-1"
                    [placeholder]="getFieldPlaceholder(field.type)">

                 <input *ngIf="field.type === 'number'" type="number"
                    [ngModel]="getFieldValue(field.id)" (ngModelChange)="updateFieldValue(field.id, $event)"
                    class="w-full bg-transparent text-white text-sm focus:outline-none border-b border-white/10 focus:border-violet-500 placeholder-white/20 transition-colors py-1"
                    [placeholder]="getFieldPlaceholder(field.type)">

                 <input *ngIf="field.type === 'date'" type="date"
                    [ngModel]="getFieldValue(field.id) | date:'yyyy-MM-dd'" (ngModelChange)="updateFieldValue(field.id, $event)"
                    class="w-full bg-transparent text-white text-sm focus:outline-none border-b border-white/10 focus:border-violet-500 placeholder-white/20 transition-colors py-1 [color-scheme:dark]">

                 <div *ngIf="field.type === 'checkbox'" class="flex items-center gap-2 py-1">
                    <input type="checkbox"
                        [ngModel]="getFieldValue(field.id)" (ngModelChange)="updateFieldValue(field.id, $event)"
                        class="w-4 h-4 rounded border-white/20 bg-white/10 text-violet-600 focus:ring-offset-0 focus:ring-0">
                    <span class="text-sm text-white/80">{{ getFieldValue(field.id) ? 'Checked' : 'Unchecked' }}</span>
                 </div>

                 <select *ngIf="field.type === 'dropdown'"
                    [ngModel]="getFieldValue(field.id)" (ngModelChange)="updateFieldValue(field.id, $event)"
                    class="w-full bg-transparent text-white text-sm focus:outline-none border-b border-white/10 focus:border-violet-500 cursor-pointer py-1">
                    <option [ngValue]="null" class="bg-slate-800 text-white/50">Select option</option>
                    <option *ngFor="let opt of field.options" [ngValue]="opt" class="bg-slate-800 text-white">{{ opt }}</option>
                 </select>

                 <p class="text-[10px] text-white/35 mt-2">{{ getFieldHelp(field.type) }}</p>
               </div>
             </div>
          </div>
          <!-- Description Section -->
          <div class="p-6 border-b border-white/10">
            <div class="flex items-center gap-2 mb-3 text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10H7"></path><path d="M21 6H3"></path><path d="M21 14H3"></path><path d="M17 18H7"></path></svg>
              <h3 class="text-sm font-semibold">Description</h3>
            </div>
            
            @if (isEditingDescription()) {
              <div class="space-y-2">
                <div #descriptionToolbar class="relative flex flex-wrap items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-white/70">
                  <button (click)="applyDescriptionTool('heading')" class="h-7 min-w-7 px-2 rounded hover:bg-white/10 text-[11px] font-semibold inline-flex items-center gap-1" title="Heading">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M16 18h4"/></svg>H
                  </button>
                  <button (click)="applyDescriptionTool('bold')" class="h-7 min-w-7 px-2 rounded hover:bg-white/10 text-xs font-bold inline-flex items-center gap-1" title="Bold (Ctrl+B)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/></svg>B
                  </button>
                  <button (click)="applyDescriptionTool('italic')" class="h-7 min-w-7 px-2 rounded hover:bg-white/10 text-xs italic inline-flex items-center gap-1" title="Italic (Ctrl+I)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 4h-9"/><path d="M14 20H5"/><path d="M15 4 9 20"/></svg>I
                  </button>
                  <button (click)="applyDescriptionTool('strikethrough')" class="h-7 min-w-7 px-2 rounded hover:bg-white/10 text-xs line-through inline-flex items-center gap-1" title="Strikethrough (Ctrl+Shift+X)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8"/><path d="M4 12h16"/></svg>S
                  </button>
                  <button (click)="applyDescriptionTool('code')" class="h-7 min-w-7 px-2 rounded hover:bg-white/10 text-[11px] font-mono inline-flex items-center gap-1" title="Inline code (Ctrl+Shift+C)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
                  </button>
                  <div class="h-5 w-px bg-white/10 mx-1"></div>

                  <div class="relative">
                    <button (click)="toggleDescriptionMenu('list')" class="h-7 px-2.5 rounded hover:bg-white/10 text-xs inline-flex items-center gap-1" title="Lists">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>List
                    </button>
                    @if (descriptionMenu() === 'list') {
                    <div class="absolute left-0 top-9 z-20 w-56 rounded-lg border border-white/15 bg-slate-900/95 p-1.5 shadow-xl">
                      <button (click)="applyDescriptionTool('bullet')" class="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">
                        <span>Bullet list</span><span class="text-white/35">Ctrl+Shift+8</span>
                      </button>
                      <button (click)="applyDescriptionTool('numbered')" class="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">
                        <span>Numbered list</span><span class="text-white/35">Ctrl+Shift+7</span>
                      </button>
                      <button (click)="applyDescriptionTool('checklist')" class="w-full px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">
                        Checklist
                      </button>
                    </div>
                    }
                  </div>

                  <div class="relative">
                    <button (click)="openLinkMenu()" class="h-7 px-2.5 rounded hover:bg-white/10 text-xs inline-flex items-center gap-1" title="Link (Ctrl+K)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Link
                    </button>
                    @if (descriptionMenu() === 'link') {
                    <div class="absolute left-0 top-9 z-20 w-64 rounded-lg border border-white/15 bg-slate-900/95 p-2 shadow-xl space-y-2">
                      <input [(ngModel)]="descriptionLinkText" class="nexus-field w-full h-8 text-xs" placeholder="Display text (optional)">
                      <input [(ngModel)]="descriptionLinkUrl" class="nexus-field w-full h-8 text-xs" placeholder="https://example.com">
                      <div class="flex justify-end gap-2">
                        <button (click)="closeDescriptionMenu()" class="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 text-xs">Cancel</button>
                        <button (click)="insertDescriptionLink()" class="h-7 px-2.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white">Insert</button>
                      </div>
                    </div>
                    }
                  </div>

                  <div class="relative">
                    <button (click)="toggleDescriptionMenu('image')" class="h-7 px-2.5 rounded hover:bg-white/10 text-xs inline-flex items-center gap-1" title="Image">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2.12 2.12 0 0 0-3 0L6 20"/></svg>Img
                    </button>
                    @if (descriptionMenu() === 'image') {
                    <div class="absolute left-0 top-9 z-20 w-72 rounded-lg border border-white/15 bg-slate-900/95 p-2 shadow-xl space-y-2">
                      <input [(ngModel)]="descriptionImageAlt" class="nexus-field w-full h-8 text-xs" placeholder="Alt text (optional)">
                      <input [(ngModel)]="descriptionImageUrl" class="nexus-field w-full h-8 text-xs" placeholder="Image URL https://...">
                      <div class="flex items-center justify-between">
                        <label class="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 text-xs cursor-pointer inline-flex items-center">
                          Upload image
                          <input #descriptionImageFileInput type="file" accept="image/*" class="hidden" (change)="onDescriptionImageFileSelected($event)">
                        </label>
                        <button (click)="insertDescriptionImageUrl()" class="h-7 px-2.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white">
                          Insert URL
                        </button>
                      </div>
                    </div>
                    }
                  </div>

                  <div class="relative">
                    <button (click)="toggleDescriptionMenu('plus')" class="h-7 px-2.5 rounded hover:bg-white/10 text-xs inline-flex items-center gap-1" title="More">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>+
                    </button>
                    @if (descriptionMenu() === 'plus') {
                    <div class="absolute left-0 top-9 z-20 w-56 rounded-lg border border-white/15 bg-slate-900/95 p-1.5 shadow-xl">
                      <button (click)="openMentionMenu()" class="w-full px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a2 2 0 1 0 4 0v-1a8 8 0 1 0-2.84 6.13"/></svg>Mention
                      </button>
                      <button (click)="applyDescriptionTool('emoji')" class="w-full px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">Emoji</button>
                      <button (click)="applyDescriptionTool('codeblock')" class="w-full px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">Code snippet</button>
                      <button (click)="applyDescriptionTool('quote')" class="w-full px-2.5 py-2 rounded hover:bg-white/10 text-left text-xs">Quote</button>
                    </div>
                    }
                  </div>

                  @if (descriptionMenu() === 'mention') {
                  <div class="absolute left-2 top-9 z-20 w-72 rounded-lg border border-white/15 bg-slate-900/95 p-2 shadow-xl space-y-2">
                    <input [(ngModel)]="descriptionMentionQuery" class="nexus-field w-full h-8 text-xs" placeholder="Search member by name or email">
                    <div class="max-h-44 overflow-auto custom-scrollbar space-y-1">
                      @for (member of descriptionMentionCandidates(); track member.id) {
                      <button (click)="insertMemberMention(member)" class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 text-left">
                        <div class="w-6 h-6 rounded-full bg-violet-500/80 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden">
                          @if (member.avatar_url) {
                          <img [src]="resolveAvatarUrl(member.avatar_url)" class="w-full h-full object-cover" alt="Member avatar">
                          } @else {
                          {{ (member.name || '?').charAt(0).toUpperCase() }}
                          }
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs text-white/90 truncate">{{ member.name }}</p>
                          <p class="text-[10px] text-white/45 truncate">{{ member.email }}</p>
                        </div>
                      </button>
                      } @empty {
                      <p class="text-[11px] text-white/45 px-2 py-1">No member matched.</p>
                      }
                    </div>
                  </div>
                  }

                  <div class="ml-auto flex items-center gap-1">
                    <button (click)="descriptionPreview.set(!descriptionPreview())"
                            class="h-7 px-2.5 rounded text-[11px] font-semibold transition-colors"
                            [ngClass]="descriptionPreview() ? 'bg-violet-600/80 text-white' : 'hover:bg-white/10 text-white/70'">
                      {{ descriptionPreview() ? 'Editing' : 'Preview' }}
                    </button>
                  </div>
                </div>

                @if (!descriptionPreview()) {
                  <textarea
                    #descriptionEditor
                    [(ngModel)]="descriptionDraft"
                    (keydown)="onDescriptionKeydown($event)"
                    class="w-full h-32 bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-y"
                    placeholder="Write your description... (Ctrl+Enter to save, Esc to cancel)">
                  </textarea>
                } @else {
                  <div class="min-h-[128px] max-h-[280px] overflow-auto custom-scrollbar bg-white/5 border border-white/20 rounded-lg p-3">
                    @if (descriptionDraft.trim()) {
                      <div class="text-white/85 whitespace-pre-wrap markdown-content" [innerHTML]="descriptionDraft | markdown | async"></div>
                    } @else {
                      <p class="text-white/35 italic">Nothing to preview yet.</p>
                    }
                  </div>
                }

                <div class="flex items-center justify-between gap-2">
                  <p class="text-[11px] text-white/35">Shortcuts: Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Shift+7/8, Ctrl+Shift+X, Ctrl+Enter.</p>
                  <div class="flex gap-2">
                    <button (click)="cancelEditDescription()" class="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">
                      Cancel
                    </button>
                    <button (click)="saveDescription()" class="h-8 px-3 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <div 
                (click)="startEditDescription()" 
                class="min-h-[80px] p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                @if (card()!.description) {
                  <div class="text-white/80 whitespace-pre-wrap markdown-content" [innerHTML]="card()!.description | markdown | async"></div>
                } @else {
                  <p class="text-white/40 italic">Click to add description...</p>
                }
              </div>
            }
          </div>


          <!-- Attachments Section -->
          <div class="p-6 border-b border-white/10">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2 text-white/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  <h3 class="text-sm font-semibold">Attachments</h3>
                </div>
                <div class="relative">
                    <input type="file" #fileInput class="hidden" (change)="onFileSelected($event)" />
                    <button (click)="fileInput.click()" [disabled]="isUploading()" 
                            class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg text-xs transition-colors disabled:opacity-50">
                        {{ isUploading() ? 'Uploading...' : '+ Add' }}
                    </button>
                </div>
            </div>

            <div class="space-y-2">
                @for (attachment of card()!.attachments; track attachment.id) {
                    <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                        <!-- Preview Thumbnail or Icon -->
                        <div class="w-10 h-10 rounded bg-black/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                            @if (attachment.file_type.startsWith('image/')) {
                                <img [src]="resolveFileUrl(attachment.file_path)" class="w-full h-full object-cover">
                            } @else {
                                <span class="text-xs text-white/40">DOC</span>
                            }
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
                            <a [href]="resolveFileUrl(attachment.file_path)" target="_blank" 
                               class="text-sm text-white hover:underline truncate block">
                                {{ attachment.filename }}
                            </a>
                            <div class="text-[10px] text-white/40">
                                {{ (attachment.size / 1024).toFixed(1) }} KB | {{ attachment.created_at | date:'shortDate' }}
                                
                                @if (attachment.file_type.startsWith('image/')) {
                                    @if (card()!.cover_attachment_id === attachment.id) {
                                        <span class="ml-2 text-amber-400 font-semibold">| Cover Image</span>
                                        <button (click)="removeCover()" class="ml-2 text-white/40 hover:text-white hover:underline cursor-pointer">Remove</button>
                                    } @else {
                                        <button (click)="makeCover(attachment.id)" class="ml-2 text-white/40 hover:text-white hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">Make Cover</button>
                                    }
                                }
                            </div>
                        </div>

                        <!-- Actions -->
                        <button (click)="deleteAttachment(attachment.id)" class="text-white/40 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            x
                        </button>
                    </div>
                }
                
                @if (!card()!.attachments?.length) {
                    <div class="text-xs text-white/30 italic">No attachments yet.</div>
                }
            </div>
          </div>

          <!-- Checklists Section -->
          <div class="p-6" cdkDropList (cdkDropListDropped)="dropChecklist($event)">
            @for (checklist of card()!.checklists; track checklist.id) {
              <div class="mb-6 relative group/checklist bg-white/5 p-4 rounded-xl border border-white/5" cdkDrag>
                <div class="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div class="flex items-center gap-3">
                    <div cdkDragHandle class="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>
                    <div class="flex items-center gap-2 text-white/60">
                      <span>Checklist</span>
                      <h3 class="text-sm font-semibold text-white tracking-wide">{{ checklist.title }}</h3>
                    </div>
                  </div>
                  <button (click)="deleteChecklist(checklist.id)" class="text-white/40 hover:text-red-400 transition-colors p-1 rounded hover:bg-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>

                <!-- Progress Bar -->
                <div class="mb-3">
                  <div class="flex justify-between text-xs text-white/40 mb-1">
                    <span>{{ getProgress(checklist) }}%</span>
                  </div>
                  <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
                      [style.width.%]="getProgress(checklist)">
                    </div>
                  </div>
                </div>

                <!-- Items -->
                <div
                    [id]="checklist.id"
                    cdkDropList
                    [cdkDropListData]="checklist.items"
                    [cdkDropListConnectedTo]="getChecklistIds()"
                    (cdkDropListDropped)="dropItem($event, checklist.id)"
                    class="space-y-1 min-h-[4px]">
                    @for (item of checklist.items; track item.id) {
                      <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group/item" cdkDrag>
                        <input 
                          type="checkbox" 
                          [checked]="$any(item).is_completed"
                          (change)="toggleItem(item)"
                          class="w-4 h-4 rounded border-white/30 bg-transparent text-violet-500 focus:ring-violet-500/30">
                        <span 
                          [ngClass]="{'line-through text-white/40': $any(item).is_completed, 'text-white/80': !$any(item).is_completed}"
                          class="flex-1 transition-colors text-sm">
                          {{ item.title }}
                        </span>
                        <div class="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <div cdkDragHandle class="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                            </div>
                            <button (click)="deleteItem(item.id)" class="text-white/40 hover:text-red-400 p-1">
                              x
                            </button>
                        </div>
                      </div>
                    }
                </div>

                <!-- Add Item -->
                <div class="mt-2">
                  @if (addingItemToChecklist() === checklist.id) {
                    <div class="flex gap-2">
                      <input 
                        type="text" 
                        [(ngModel)]="newItemTitle"
                        (keyup.enter)="addItem(checklist.id)"
                        placeholder="Add item..."
                        class="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500">
                      <button (click)="addItem(checklist.id)" class="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500">
                        Add
                      </button>
                      <button (click)="cancelAddItem()" class="px-3 py-2 text-white/60 text-sm">
                        x
                      </button>
                    </div>
                  } @else {
                    <button 
                      (click)="startAddItem(checklist.id)" 
                      class="text-sm text-white/40 hover:text-white/60 transition-colors">
                      + Add item
                    </button>
                  }
                </div>
              </div>
            }

            @if (false) {
            <!-- Add Checklist Button -->
            <div class="mt-4">
              @if (isAddingChecklist()) {
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    [(ngModel)]="newChecklistTitle"
                    (keyup.enter)="addChecklist()"
                    placeholder="Checklist title..."
                    class="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500">
                  <button (click)="addChecklist()" class="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500">
                    Add
                  </button>
                  <button (click)="cancelAddChecklist()" class="px-3 py-2 text-white/60 text-sm">
                    x
                  </button>
                </div>
              } @else {
                <button 
                  (click)="startAddChecklist()" 
                  class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors">
                  <span>+</span> Add Checklist
                </button>
              }
            </div>
            }
          </div>

          @if (false) {
          <!-- Comments Section -->
          <div class="p-6 border-t border-white/10">
            <div class="flex items-center gap-2 mb-4 text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>
              <h3 class="text-sm font-semibold">Comments</h3>
            </div>

            <!-- Comment List -->
            <div class="space-y-4 mb-6">
              @for (comment of card()!.comments; track comment.id) {
                <div class="flex gap-3 group">
                  <!-- Avatar -->
                  <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase">
                    {{ comment.user?.name?.charAt(0) || '?' }}
                  </div>
                  
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-semibold text-white">{{ comment.user?.name || 'Unknown' }}</span>
                      <span class="text-xs text-white/40">{{ comment.created_at | date:'short' }}</span>
                      @if (canDeleteComment(comment.user_id)) {
                        <button (click)="deleteComment(comment.id)" class="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all ml-auto">
                          🗑️
                        </button>
                      }
                    </div>
                    <p class="text-sm text-white/90 bg-white/5 rounded-lg p-3 border border-white/10">
                      {{ comment.content }}
                    </p>
                  </div>
                </div>
              }
              @if (!card()!.comments?.length) {
                <div class="text-center text-white/30 text-sm py-4">No comments yet.</div>
              }
            </div>

            <!-- Add Comment -->
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white/40">
                👤
              </div>
              <div class="flex-1">
                <textarea 
                  [(ngModel)]="newCommentContent"
                  (keydown)="onCommentKeydown($event)"
                  placeholder="Write a comment... (Ctrl+Enter to send)"
                  class="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none h-20 text-sm"
                ></textarea>
                @if (newCommentContent.trim()) {
                  <div class="flex justify-end mt-2">
                    <button (click)="addComment()" class="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500 transition-colors font-medium">
                      Comment
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Activity Section -->
          <div class="p-6 border-t border-white/10">
            <div class="flex items-center gap-2 mb-4 text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>
              <h3 class="text-sm font-semibold">Activity</h3>
            </div>
            <app-activity-feed [cardId]="card()!.id"></app-activity-feed>
          </div>
          }

          </div>
          <!-- END LEFT COLUMN -->

          <!-- RIGHT: Comments + Activity Panel -->
          <div class="w-[460px] shrink-0 border-l border-white/5 bg-black/25 flex flex-col min-h-0">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div class="flex items-center gap-2 text-white/90 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Comments and activity</span>
              </div>
              <button (click)="hideRightDetails.set(!hideRightDetails())" class="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80 font-medium">
                {{ hideRightDetails() ? 'Show details' : 'Hide details' }}
              </button>
            </div>

            @if (!hideRightDetails()) {
            <div class="p-5 border-b border-white/10">
                <div class="flex items-start gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-white/10 text-white/60 text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  @if (authService.currentUser()?.avatar_url) {
                    <img [src]="resolveAvatarUrl(authService.currentUser()?.avatar_url)" class="w-full h-full object-cover" alt="Your avatar" />
                  } @else {
                    {{ authService.currentUser()?.name?.charAt(0)?.toUpperCase() || '?' }}
                  }
                </div>
                <textarea
                  #commentEditor
                  [(ngModel)]="newCommentContent"
                  (keydown)="onCommentKeydown($event)"
                  placeholder="Write a comment..."
                  class="w-full bg-white/5 border border-white/20 rounded-lg p-3.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none h-[52px] text-sm"
                ></textarea>
              </div>
              <div #commentMentionRoot class="mt-2 flex items-center justify-between">
                <div class="relative">
                  <button (click)="toggleCommentMentionMenu()" class="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/75 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a2 2 0 1 0 4 0v-1a8 8 0 1 0-2.84 6.13"/></svg>
                    Mention
                  </button>
                  @if (showCommentMentionMenu()) {
                  <div class="absolute left-0 top-8 z-20 w-72 rounded-lg border border-white/15 bg-slate-900/95 p-2 shadow-xl space-y-2">
                    <input [(ngModel)]="commentMentionQuery" class="nexus-field w-full h-8 text-xs" placeholder="Search member by name or email">
                    <div class="max-h-44 overflow-auto custom-scrollbar space-y-1">
                      @for (member of commentMentionCandidates(); track member.id) {
                      <button (click)="insertCommentMention(member)" class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 text-left">
                        <div class="w-6 h-6 rounded-full bg-violet-500/80 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden">
                          @if (member.avatar_url) {
                          <img [src]="resolveAvatarUrl(member.avatar_url)" class="w-full h-full object-cover" alt="Member avatar">
                          } @else {
                          {{ (member.name || '?').charAt(0).toUpperCase() }}
                          }
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs text-white/90 truncate">{{ member.name }}</p>
                          <p class="text-[10px] text-white/45 truncate">{{ member.email }}</p>
                        </div>
                      </button>
                      } @empty {
                      <p class="text-[11px] text-white/45 px-2 py-1">No member matched.</p>
                      }
                    </div>
                  </div>
                  }
                </div>
              </div>
              @if (newCommentContent.trim()) {
                <div class="flex justify-end mt-2">
                  <button (click)="addComment()" class="px-3 py-1.5 bg-violet-600 text-white rounded-md text-xs hover:bg-violet-500 transition-colors font-medium">
                    Comment
                  </button>
                </div>
              }
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div class="space-y-3">
                @for (comment of card()!.comments; track comment.id) {
                  <div class="flex gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-white/15 text-white text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      @if (comment.user?.avatar_url) {
                        <img [src]="resolveAvatarUrl(comment.user?.avatar_url)" class="w-full h-full object-cover" alt="Comment user avatar" />
                      } @else {
                        {{ comment.user?.name?.charAt(0)?.toUpperCase() || '?' }}
                      }
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="text-xs text-white/80 font-semibold">{{ comment.user?.name || 'Unknown' }}</p>
                        <p class="text-[11px] text-white/35">{{ comment.created_at | date:'MMM d, h:mm a' }}</p>
                        @if (canDeleteComment(comment.user_id)) {
                          <button (click)="deleteComment(comment.id)" class="ml-auto text-[11px] text-white/35 hover:text-red-400 transition-colors">
                            Delete
                          </button>
                        }
                      </div>
                      <div class="text-sm text-white/85 break-words markdown-content" [innerHTML]="comment.content | markdown | async"></div>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-white/35">No comments yet.</p>
                }
              </div>

              <div class="border-t border-white/10 pt-3">
                <p class="text-[11px] font-semibold text-white/55 mb-2">Activity</p>
                <app-activity-feed [cardId]="card()!.id"></app-activity-feed>
              </div>
            </div>

            <div class="p-5 border-t border-white/10 space-y-2 bg-black/30 shrink-0">
              <p class="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Actions</p>
            <button (click)="openOperationModal('copy')" class="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm text-left flex items-center gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
              Copy
            </button>
            <button (click)="openOperationModal('move')" class="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm text-left flex items-center gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              Move
            </button>
            <button (click)="saveAsTemplate()" class="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm text-left flex items-center gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
              Template
            </button>
            <div class="border-t border-white/5 my-2"></div>
            <button (click)="archiveCard()" class="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400/80 hover:text-amber-400 text-sm text-left flex items-center gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></svg>
              Archive
            </button>
            <button (click)="deleteCard()" class="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-red-400/80 hover:text-red-400 text-sm text-left flex items-center gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              Delete
            </button>
            </div>
            }
          </div>
          </div>
          <!-- END 2-COLUMN LAYOUT -->
        }
      </div>

      <!-- Operation Modal -->
      @if (showOperationModal() && card()) {
        <app-card-operation-modal
          [card]="card()!"
          [action]="operationAction()"
          [currentBoardId]="resolvedBoardId()"
          (close)="closeOperationModal()"
          (completed)="onOperationCompleted()">
        </app-card-operation-modal>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host ::ng-deep .markdown-content a[href^="mention:"] {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.05rem 0.45rem;
      margin: 0 0.05rem;
      border-radius: 999px;
      border: 1px solid rgba(139, 92, 246, 0.45);
      background: rgba(139, 92, 246, 0.16);
      color: rgb(221 214 254);
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      pointer-events: none;
    }
  `]
})
export class CardDetailComponent implements OnInit, OnDestroy, OnChanges {
  @Input() cardId: string | null = null;
  @Output() close = new EventEmitter<void>();

  private cardService = inject(CardService);
  private boardService = inject(BoardService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptions = new Subscription();

  private wsService = inject(WebSocketService);
  private dialogService = inject(DialogService);

  card = signal<CardDetail | null>(null);
  isLoading = signal(false);
  hideRightDetails = signal(false);
  showDueControls = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cardId'] && this.cardId) {
      const boardId = this.resolveBoardIdFromRoute();
      if (boardId) {
        this.activeBoardId.set(boardId);
        this.ensureCustomFieldsLoaded(boardId);
      }
      this.loadCard(this.cardId);
    }
  }

  closeModal() {
    if (this.cardId) {
      // Used as a modal via @Input — let the parent handle cleanup
      this.close.emit();
    } else {
      // Used as a routed component — navigate back to the board
      this.navigateBack();
    }
  }

  // Custom Fields
  private customFieldService = inject(CustomFieldService);
  private preferencesService = inject(PreferencesService);
  customFields: CustomField[] = [];
  fieldValues = signal<CardCustomFieldValue[]>([]);
  activeBoardId = signal<string | null>(null);
  private lastFieldsBoardId: string | null = null;
  suggestionsEnabled = computed(() => this.preferencesService.preferences()?.enable_suggestions !== false);
  showCardSuggestionHint = signal(true);

  // Card Operations (Move/Copy)
  showOperationModal = signal(false);
  operationAction = signal<'move' | 'copy'>('move');
  isSubscribed = signal(false);

  toggleWatch() {
    const cardId = this.card()?.id;
    if (!cardId) return;

    if (this.isSubscribed()) {
      this.cardService.unsubscribe(cardId).subscribe(() => this.isSubscribed.set(false));
    } else {
      this.cardService.subscribe(cardId).subscribe(() => this.isSubscribed.set(true));
    }
  }


  canDeleteComment(commentUserId: string): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    const userRole = this.boardService.userRole();
    return commentUserId === currentUserId || userRole === 'owner' || userRole === 'admin';
  }

  // --- Drag & Drop ---

  getChecklistIds(): string[] {
    return this.card()?.checklists.map(c => c.id) || [];
  }

  calculateMidpoint(prev: number | undefined, next: number | undefined): number {
    if (prev === undefined && next === undefined) return 16384;
    if (prev === undefined) return next! / 2;
    if (next === undefined) return (prev || 0) + 16384;
    return (prev + next) / 2;
  }

  dropChecklist(event: CdkDragDrop<Checklist[]>) {
    const prevIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    if (prevIndex === currentIndex) return;

    const checklists = this.card()?.checklists || [];
    const movedChecklist = checklists[prevIndex];

    // Logic: calculate position based on final state
    // We simulate the move locally first to get items in right slots
    const temp = [...checklists];
    moveItemInArray(temp, prevIndex, currentIndex);

    const prevChecklist = temp[currentIndex - 1];
    const nextChecklist = temp[currentIndex + 1];

    const newPosition = this.calculateMidpoint(prevChecklist?.position, nextChecklist?.position);

    // Apply locally
    checklists[prevIndex].position = newPosition;
    moveItemInArray(checklists, prevIndex, currentIndex);

    this.cardService.moveChecklist(movedChecklist.id, newPosition).subscribe();
  }

  dropItem(event: CdkDragDrop<ChecklistItem[]>, targetChecklistId: string) {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;

      const items = event.container.data;
      const movedItem = items[event.previousIndex];

      const temp = [...items];
      moveItemInArray(temp, event.previousIndex, event.currentIndex);

      const prev = temp[event.currentIndex - 1];
      const next = temp[event.currentIndex + 1];
      const newPos = this.calculateMidpoint(prev?.position, next?.position);

      moveItemInArray(items, event.previousIndex, event.currentIndex);
      movedItem.position = newPos;

      this.cardService.moveChecklistItem(movedItem.id, newPos).subscribe();
    } else {
      const prevItems = event.previousContainer.data;
      const currentItems = event.container.data;
      const movedItem = prevItems[event.previousIndex];

      const temp = [...currentItems];
      // Insert at currentIndex
      temp.splice(event.currentIndex, 0, movedItem);

      const prev = temp[event.currentIndex - 1];
      const next = temp[event.currentIndex + 1];
      const newPos = this.calculateMidpoint(prev?.position, next?.position);

      transferArrayItem(prevItems, currentItems, event.previousIndex, event.currentIndex);
      movedItem.position = newPos;
      movedItem.checklist_id = targetChecklistId;

      this.cardService.moveChecklistItem(movedItem.id, newPos, targetChecklistId).subscribe();
    }
  }




  // Description editing
  isEditingDescription = signal(false);
  descriptionPreview = signal(false);
  descriptionMenu = signal<'none' | 'list' | 'link' | 'image' | 'plus' | 'mention'>('none');
  descriptionDraft = '';
  @ViewChild('descriptionEditor') descriptionEditor?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('descriptionToolbar') descriptionToolbar?: ElementRef<HTMLElement>;
  @ViewChild('commentEditor') commentEditor?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('commentMentionRoot') commentMentionRoot?: ElementRef<HTMLElement>;
  descriptionLinkText = '';
  descriptionLinkUrl = '';
  descriptionImageAlt = '';
  descriptionImageUrl = '';
  descriptionMentionQuery = '';
  showCommentMentionMenu = signal(false);
  commentMentionQuery = '';
  descriptionMembers = signal<User[]>([]);
  descriptionMentionCandidates = computed(() => {
    const query = this.descriptionMentionQuery.trim().toLowerCase();
    const members = this.descriptionMembers();
    if (!query) return members.slice(0, 12);
    return members
      .filter(m =>
        (m.name || '').toLowerCase().includes(query) ||
        (m.email || '').toLowerCase().includes(query)
      )
      .slice(0, 12);
  });
  commentMentionCandidates = computed(() => {
    const query = this.commentMentionQuery.trim().toLowerCase();
    const members = this.descriptionMembers();
    if (!query) return members.slice(0, 12);
    return members
      .filter(m =>
        (m.name || '').toLowerCase().includes(query) ||
        (m.email || '').toLowerCase().includes(query)
      )
      .slice(0, 12);
  });

  // Checklist adding
  isAddingChecklist = signal(false);
  newChecklistTitle = '';

  // Item adding
  addingItemToChecklist = signal<string | null>(null);
  newItemTitle = '';

  // Label Picker
  showLabelPicker = signal(false);

  toggleLabelPicker() {
    this.showLabelPicker.update(v => !v);
  }

  getLabelIds(): string[] {
    return this.card()?.labels?.map(l => l.id) || [];
  }

  onLabelToggled(labelId: string) {
    // Reload card to refresh labels
    const currentCard = this.card();
    if (currentCard) {
      this.loadCard(currentCard.id);
    }
  }

  // Member Picker
  showMemberPicker = signal(false);

  toggleMemberPicker() {
    this.showMemberPicker.update(v => !v);
  }

  getMemberIds(): string[] {
    // @ts-ignore
    return this.card()?.members?.map((m: any) => m.id) || [];
  }

  onMemberToggled(memberId: string) {
    const currentCard = this.card();
    if (currentCard) {
      this.loadCard(currentCard.id);
    }
  }

  // Due Date
  updateDueDate(event: Event) {
    const input = event.target as HTMLInputElement;
    // Backend expects time.Time. We send ISO string.
    // If empty, we send null? Backend handles it?
    // CardService UpdateCard accepts optional partial.
    // However, sending empty string might fail to parse as time.
    // We should send null if empty?
    // card_service.ts updateCard payload is { title?: string; description?: string; due_date?: string | null }
    // We need to update card.service.ts interface? It says any.

    const val = input.value;
    const date = val ? new Date(val).toISOString() : null;

    const currentCard = this.card();
    if (!currentCard) return;

    // Use any for payload to bypass strict type if needed, or update service
    this.cardService.updateCard(currentCard.id, { due_date: date } as any).subscribe(() => {
      this.loadCard(currentCard.id);
    });
  }

  getDueDateValue(): string {
    const d = this.card()?.due_date;
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  }

  dueStatusLabel(): string {
    const currentCard = this.card();
    if (!currentCard) return 'No due date';
    if (!currentCard.due_date) return 'No due date';
    if (currentCard.is_complete) return 'Complete';
    const due = new Date(currentCard.due_date).getTime();
    if (isNaN(due)) return 'Due date set';
    return due < Date.now() ? 'Overdue' : 'In progress';
  }

  dueStatusClass(): string {
    const label = this.dueStatusLabel();
    if (label === 'Complete') return 'border-green-400/40 bg-green-500/20 text-green-300';
    if (label === 'Overdue') return 'border-red-400/40 bg-red-500/20 text-red-300';
    if (label === 'In progress') return 'border-cyan-400/40 bg-cyan-500/20 text-cyan-300';
    return 'border-white/15 bg-white/5 text-white/70';
  }

  toggleIsComplete(event: Event) {
    const currentCard = this.card();
    if (!currentCard) return;

    const isComplete = (event.target as HTMLInputElement).checked;

    // Optimistic update
    this.card.set({ ...currentCard, is_complete: isComplete });

    this.cardService.updateCard(currentCard.id, { is_complete: isComplete }).subscribe(() => {
      this.loadCard(currentCard.id, true);
    });
  }

  // Attachments
  isUploading = signal(false);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  uploadFile(file: File) {
    const currentCard = this.card();
    if (!currentCard) return;

    this.isUploading.set(true);
    this.cardService.uploadAttachment(currentCard.id, file).subscribe({
      next: (attachment: Attachment) => {
        // Update local state
        const updatedAttachments = [...(currentCard.attachments || []), attachment];
        this.card.set({ ...currentCard, attachments: updatedAttachments });
        this.isUploading.set(false);
      },
      error: () => this.isUploading.set(false)
    });
  }

  async deleteAttachment(attachmentId: string) {
    const currentCard = this.card();
    if (!currentCard) return;

    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Attachment?',
      message: 'This attachment will be removed from the card.',
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });
    if (!confirmed) return;

    this.cardService.deleteAttachment(attachmentId).subscribe({
      next: () => {
        const updatedAttachments = currentCard.attachments?.filter(a => a.id !== attachmentId);
        this.card.set({ ...currentCard, attachments: updatedAttachments });

        // If it was cover, remove cover ref locally
        if (currentCard.cover_attachment_id === attachmentId) {
          this.card.set({ ...this.card()!, cover_attachment_id: undefined });
        }
      }
    });
  }

  makeCover(attachmentId: string) {
    const currentCard = this.card();
    if (!currentCard) return;

    this.cardService.makeCover(currentCard.id, attachmentId).subscribe({
      next: () => {
        this.card.set({ ...currentCard, cover_attachment_id: attachmentId });
        this.boardService.triggerRefresh(); // Refresh board to show cover
      }
    });
  }

  removeCover() {
    const currentCard = this.card();
    if (!currentCard) return;

    this.cardService.removeCover(currentCard.id).subscribe({
      next: () => {
        this.card.set({ ...currentCard, cover_attachment_id: undefined });
        this.boardService.triggerRefresh();
      }
    });
  }

  ngOnInit() {
    this.showCardSuggestionHint.set(!this.preferencesService.isSuggestionDismissed('card_quick_tip'));

    const routeBoardId = this.resolveBoardIdFromRoute();
    if (routeBoardId) {
      this.activeBoardId.set(routeBoardId);
      // ngOnChanges can run before ngOnInit in modal usage.
      // Preload board fields here so Custom Fields appears immediately on first open.
      this.ensureCustomFieldsLoaded(routeBoardId);
    }

    const routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('cardId');
      if (id) {
        this.loadCard(id);
      }
    });
    this.subscriptions.add(routeSub);

    // Debug: Log connection status

    // Real-Time Sync: Listen for generic card updates
    const wsSub = this.wsService.onEvent('CARD_UPDATED').subscribe((data: any) => {
      const currentCard = this.card();
      if (currentCard && data?.card_id === currentCard.id) {
        this.loadCard(currentCard.id, true);
      } else {
      }
    });
    this.subscriptions.add(wsSub);

    const wsBoardSub = this.wsService.onEvent('BOARD_UPDATED').subscribe((data: any) => {
      const boardId = this.resolvedBoardId();
      if (!boardId) return;
      if (!data?.board_id || data.board_id === boardId) {
        this.loadCustomFields(boardId);
        const currentCard = this.card();
        if (currentCard?.id) {
          this.loadCardFieldValues(currentCard.id);
        }
      }
    });
    this.subscriptions.add(wsBoardSub);
  }


  loadCard(id: string, isSilent = false) {
    if (!isSilent) this.isLoading.set(true);
    const cardSub = this.cardService.getCardById(id).subscribe({
      next: (data) => {
        this.card.set(data);
        this.fieldValues.set(data.custom_field_values || []);
        this.isLoading.set(false);
        this.cardService.getSubscriptionStatus(id).subscribe(res => this.isSubscribed.set(res.is_subscribed));

        // Resolve board context robustly: prefer payload, fallback to current board route.
        const boardId = data.column?.board_id
          || this.activeBoardId()
          || this.resolveBoardIdFromRoute();
        if (boardId) {
          this.activeBoardId.set(boardId);
          this.ensureCustomFieldsLoaded(boardId);
        }
        this.loadCardFieldValues(id);
      },
      error: () => this.isLoading.set(false)
    });
    this.subscriptions.add(cardSub);
  }

  async saveAsTemplate() {
    const currentCard = this.card();
    if (!currentCard) return;

    const templateName = await this.dialogService.openPrompt({
      title: 'Save Card as Template',
      promptLabel: 'Template Name',
      promptValue: currentCard.title,
      confirmLabel: 'Save Template',
      type: 'prompt'
    });

    if (templateName) {
      this.boardService.saveCardAsTemplate(currentCard.id, templateName).subscribe({
        next: () => {
          this.loadCard(currentCard.id, true);
        }
      });
    }
  }

  navigateBack() {
    // Trigger board refresh so card face updates with new metadata
    this.boardService.triggerRefresh();

    const boardId = this.resolvedBoardId();
    if (boardId) {
      this.router.navigate(['/board', boardId]);
    } else {
      this.router.navigate(['..'], { relativeTo: this.route });
    }
  }

  // Description
  startEditDescription() {
    this.descriptionDraft = this.card()?.description || '';
    this.isEditingDescription.set(true);
    this.descriptionPreview.set(false);
    this.closeDescriptionMenu();
    this.loadDescriptionMembers();
    setTimeout(() => this.descriptionEditor?.nativeElement?.focus(), 0);
  }

  cancelEditDescription() {
    this.isEditingDescription.set(false);
    this.descriptionPreview.set(false);
    this.closeDescriptionMenu();
  }

  saveDescription() {
    const currentCard = this.card();
    if (!currentCard) return;

    // Optimistic update
    this.card.set({ ...currentCard, description: this.descriptionDraft });
    this.isEditingDescription.set(false);
    this.descriptionPreview.set(false);
    this.closeDescriptionMenu();

    this.cardService.updateCard(currentCard.id, { description: this.descriptionDraft }).subscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) return;

    if (this.isEditingDescription() && this.descriptionMenu() !== 'none') {
      const toolbar = this.descriptionToolbar?.nativeElement;
      if (toolbar && !toolbar.contains(target)) {
        this.closeDescriptionMenu();
      }
    }

    if (this.showCommentMentionMenu()) {
      const mentionRoot = this.commentMentionRoot?.nativeElement;
      if (mentionRoot && !mentionRoot.contains(target)) {
        this.showCommentMentionMenu.set(false);
      }
    }
  }

  toggleDescriptionMenu(menu: 'list' | 'link' | 'image' | 'plus' | 'mention') {
    this.descriptionMenu.set(this.descriptionMenu() === menu ? 'none' : menu);
  }

  closeDescriptionMenu() {
    this.descriptionMenu.set('none');
  }

  openLinkMenu() {
    const editor = this.descriptionEditor?.nativeElement;
    const selected = editor
      ? this.descriptionDraft.slice(editor.selectionStart ?? 0, editor.selectionEnd ?? 0).trim()
      : '';
    this.descriptionLinkText = selected || this.descriptionLinkText || '';
    this.descriptionLinkUrl = this.descriptionLinkUrl || '';
    this.descriptionMenu.set('link');
  }

  openMentionMenu() {
    this.descriptionMentionQuery = '';
    this.loadDescriptionMembers();
    this.descriptionMenu.set('mention');
  }

  private loadDescriptionMembers() {
    const boardId = this.resolvedBoardId();
    if (!boardId) {
      this.descriptionMembers.set([]);
      return;
    }

    this.boardService.getBoardById(boardId).subscribe({
      next: (boardData: any) => {
        const workspaceId = boardData?.board?.workspace_id;
        if (!workspaceId) {
          this.descriptionMembers.set([]);
          return;
        }
        this.boardService.getWorkspaceMembers(workspaceId).subscribe({
          next: (members: any[]) => {
            const normalized = (members || [])
              .map(m => m.user || m)
              .filter((u: any) => !!u?.id);
            this.descriptionMembers.set(normalized);
          },
          error: () => this.descriptionMembers.set([])
        });
      },
      error: () => this.descriptionMembers.set([])
    });
  }

  insertMemberMention(member: User) {
    const label = member.name || member.email || 'member';
    const mentionText = `[@${label}](mention:${member.id})`;
    this.insertAtCursor(mentionText + ' ');
    this.closeDescriptionMenu();
  }

  toggleCommentMentionMenu() {
    if (this.showCommentMentionMenu()) {
      this.showCommentMentionMenu.set(false);
      return;
    }
    this.commentMentionQuery = '';
    this.loadDescriptionMembers();
    this.showCommentMentionMenu.set(true);
  }

  insertCommentMention(member: User) {
    const label = member.name || member.email || 'member';
    const mentionText = `[@${label}](mention:${member.id}) `;
    const editor = this.commentEditor?.nativeElement;
    if (!editor) {
      this.newCommentContent = (this.newCommentContent || '') + mentionText;
      this.showCommentMentionMenu.set(false);
      return;
    }

    const start = editor.selectionStart ?? this.newCommentContent.length;
    const end = editor.selectionEnd ?? this.newCommentContent.length;
    this.newCommentContent =
      this.newCommentContent.slice(0, start) +
      mentionText +
      this.newCommentContent.slice(end);

    const caret = start + mentionText.length;
    this.showCommentMentionMenu.set(false);
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(caret, caret);
    }, 0);
  }

  onDescriptionKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === 'b') {
      event.preventDefault();
      this.applyDescriptionTool('bold');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'i') {
      event.preventDefault();
      this.applyDescriptionTool('italic');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      this.openLinkMenu();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'x') {
      event.preventDefault();
      this.applyDescriptionTool('strikethrough');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === '8') {
      event.preventDefault();
      this.applyDescriptionTool('bullet');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === '7') {
      event.preventDefault();
      this.applyDescriptionTool('numbered');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'c') {
      event.preventDefault();
      this.applyDescriptionTool('code');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.saveDescription();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditDescription();
    }
  }

  applyDescriptionTool(tool: 'heading' | 'bold' | 'italic' | 'strikethrough' | 'quote' | 'code' | 'codeblock' | 'bullet' | 'numbered' | 'checklist' | 'link' | 'image' | 'divider' | 'mention' | 'emoji') {
    switch (tool) {
      case 'heading':
        this.prefixSelection('# ');
        break;
      case 'bold':
        this.wrapSelection('**', '**', 'bold text');
        break;
      case 'italic':
        this.wrapSelection('*', '*', 'italic text');
        break;
      case 'strikethrough':
        this.wrapSelection('~~', '~~', 'strikethrough');
        break;
      case 'quote':
        this.prefixSelection('> ');
        this.closeDescriptionMenu();
        break;
      case 'code':
        this.wrapSelection('`', '`', 'code');
        break;
      case 'codeblock':
        this.insertAtCursor('\n```text\ncode snippet\n```\n');
        this.closeDescriptionMenu();
        break;
      case 'bullet':
        this.prefixSelection('- ');
        this.closeDescriptionMenu();
        break;
      case 'numbered':
        this.prefixNumberedSelection();
        this.closeDescriptionMenu();
        break;
      case 'checklist':
        this.prefixSelection('- [ ] ');
        this.closeDescriptionMenu();
        break;
      case 'link':
        this.openLinkMenu();
        break;
      case 'image':
        this.toggleDescriptionMenu('image');
        break;
      case 'divider':
        this.insertAtCursor('\n---\n');
        break;
      case 'mention':
        this.openMentionMenu();
        break;
      case 'emoji':
        this.insertAtCursor(' 😀 ');
        this.closeDescriptionMenu();
        break;
    }
    setTimeout(() => this.descriptionEditor?.nativeElement?.focus(), 0);
  }

  insertDescriptionLink() {
    const url = (this.descriptionLinkUrl || '').trim();
    if (!url) return;

    const editor = this.descriptionEditor?.nativeElement;
    if (!editor) return;
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    const selected = this.descriptionDraft.slice(start, end).trim();
    const text = (this.descriptionLinkText || selected || 'link').trim();
    const markdown = `[${text}](${url})`;

    this.descriptionDraft = this.descriptionDraft.slice(0, start) + markdown + this.descriptionDraft.slice(end);
    const caret = start + markdown.length;
    this.closeDescriptionMenu();
    this.descriptionLinkText = '';
    this.descriptionLinkUrl = '';
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(caret, caret);
    }, 0);
  }

  insertDescriptionImageUrl() {
    const url = (this.descriptionImageUrl || '').trim();
    if (!url) return;
    const alt = (this.descriptionImageAlt || 'image').trim();
    const markdown = `![${alt}](${url})`;
    this.insertAtCursor(markdown);
    this.descriptionImageUrl = '';
    this.descriptionImageAlt = '';
    this.closeDescriptionMenu();
  }

  onDescriptionImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const currentCard = this.card();
    if (!file || !currentCard) return;

    this.cardService.uploadAttachment(currentCard.id, file).subscribe({
      next: (attachment) => {
        const url = this.resolveFileUrl(attachment.file_path);
        const alt = this.descriptionImageAlt?.trim() || attachment.filename || 'image';
        this.insertAtCursor(`![${alt}](${url})`);
        this.descriptionImageAlt = '';
        this.closeDescriptionMenu();
      }
    });
    input.value = '';
  }

  private wrapSelection(prefix: string, suffix: string, placeholder: string) {
    const editor = this.descriptionEditor?.nativeElement;
    if (!editor) return;

    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    const selected = this.descriptionDraft.slice(start, end) || placeholder;
    this.descriptionDraft =
      this.descriptionDraft.slice(0, start) +
      prefix + selected + suffix +
      this.descriptionDraft.slice(end);

    const caret = start + prefix.length + selected.length + suffix.length;
    setTimeout(() => editor.setSelectionRange(caret, caret), 0);
  }

  private prefixSelection(prefix: string) {
    const editor = this.descriptionEditor?.nativeElement;
    if (!editor) return;

    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    const raw = this.descriptionDraft.slice(start, end) || '';
    const normalized = raw.length ? raw : 'item';
    const prefixed = normalized
      .split('\n')
      .map(line => `${prefix}${line}`)
      .join('\n');

    this.descriptionDraft =
      this.descriptionDraft.slice(0, start) +
      prefixed +
      this.descriptionDraft.slice(end);

    const caret = start + prefixed.length;
    setTimeout(() => editor.setSelectionRange(caret, caret), 0);
  }

  private prefixNumberedSelection() {
    const editor = this.descriptionEditor?.nativeElement;
    if (!editor) return;
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    const raw = this.descriptionDraft.slice(start, end) || '';
    const lines = (raw.length ? raw : 'item').split('\n');
    const prefixed = lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n');
    this.descriptionDraft =
      this.descriptionDraft.slice(0, start) +
      prefixed +
      this.descriptionDraft.slice(end);
    const caret = start + prefixed.length;
    setTimeout(() => editor.setSelectionRange(caret, caret), 0);
  }

  private insertAtCursor(text: string) {
    const editor = this.descriptionEditor?.nativeElement;
    if (!editor) return;
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    this.descriptionDraft =
      this.descriptionDraft.slice(0, start) +
      text +
      this.descriptionDraft.slice(end);
    const caret = start + text.length;
    setTimeout(() => editor.setSelectionRange(caret, caret), 0);
  }

  // Checklists
  async startAddChecklist() {
    const currentCard = this.card();
    if (!currentCard) return;

    const title = await this.dialogService.openPrompt({
      title: 'Add Checklist',
      promptLabel: 'Checklist Title',
      promptValue: '',
      confirmLabel: 'Add Checklist',
      type: 'prompt'
    });

    if (!title?.trim()) return;

    this.cardService.createChecklist(currentCard.id, title.trim()).subscribe({
      next: () => this.loadCard(currentCard.id, true)
    });
  }

  cancelAddChecklist() {
    this.isAddingChecklist.set(false);
  }

  addChecklist() {
    const currentCard = this.card();
    if (!currentCard || !this.newChecklistTitle.trim()) return;

    this.cardService.createChecklist(currentCard.id, this.newChecklistTitle).subscribe({
      next: () => {
        this.loadCard(currentCard.id);
        this.isAddingChecklist.set(false);
      }
    });
  }

  deleteChecklist(checklistId: string) {
    const currentCard = this.card();
    if (!currentCard) return;

    // Optimistic update
    this.card.set({
      ...currentCard,
      checklists: currentCard.checklists.filter(c => c.id !== checklistId)
    });

    this.cardService.deleteChecklist(checklistId).subscribe();
  }

  // Items
  startAddItem(checklistId: string) {
    this.addingItemToChecklist.set(checklistId);
    this.newItemTitle = '';
  }

  cancelAddItem() {
    this.addingItemToChecklist.set(null);
  }

  addItem(checklistId: string) {
    const currentCard = this.card();
    if (!currentCard || !this.newItemTitle.trim()) return;

    this.cardService.createChecklistItem(checklistId, this.newItemTitle).subscribe({
      next: () => {
        this.loadCard(currentCard.id);
        this.addingItemToChecklist.set(null);
      }
    });
  }

  toggleItem(item: ChecklistItem) {
    const currentCard = this.card();
    if (!currentCard) return;

    // Optimistic update
    const updatedChecklists = currentCard.checklists.map((checklist: any) => ({
      ...checklist,
      items: checklist.items.map((i: any) =>
        i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
      )
    }));
    this.card.set({ ...currentCard, checklists: updatedChecklists });

    this.cardService.toggleChecklistItem(item.id, !item.is_completed).subscribe();
  }

  deleteItem(itemId: string) {
    const currentCard = this.card();
    if (!currentCard) return;

    // Optimistic update
    const updatedChecklists = currentCard.checklists.map((checklist: any) => ({
      ...checklist,
      items: checklist.items.filter((i: any) => i.id !== itemId)
    }));
    this.card.set({ ...currentCard, checklists: updatedChecklists });

    this.cardService.deleteChecklistItem(itemId).subscribe();
  }

  getProgress(checklist: Checklist): number {
    if (checklist.items.length === 0) return 0;
    const completed = checklist.items.filter(i => i.is_completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  }

  // Comments
  newCommentContent = '';

  addComment() {
    const currentCard = this.card();
    if (!currentCard || !this.newCommentContent.trim()) return;

    this.cardService.createComment(currentCard.id, this.newCommentContent).subscribe({
      next: () => {
        this.loadCard(currentCard.id, true); // Silent reload for smoother experience
        this.newCommentContent = '';
        this.showCommentMentionMenu.set(false);
      }
    });
  }

  deleteComment(commentId: string) {
    const currentCard = this.card();
    if (!currentCard) return;

    // Optimistic update
    this.card.set({
      ...currentCard,
      comments: currentCard.comments?.filter(c => c.id !== commentId)
    });

    this.cardService.deleteComment(commentId).subscribe();
  }

  archiveCard() {
    const currentCard = this.card();
    if (!currentCard) return;

    this.boardService.archiveCard(currentCard.id).subscribe({
      next: () => {
        this.closeModal();
      }
    });
  }

  async deleteCard() {
    const currentCard = this.card();
    if (!currentCard) return;

    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Card Permanently?',
      message: `Card "${currentCard.title}" will be permanently removed.`,
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });
    if (!confirmed) return;

    this.boardService.deleteCard(currentCard.id).subscribe({
      next: () => {
        this.closeModal();
      }
    });
  }

  onCommentKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.addComment();
    }
  }

  openOperationModal(action: 'move' | 'copy') {
    this.operationAction.set(action);
    this.showOperationModal.set(true);
  }

  closeOperationModal() {
    this.showOperationModal.set(false);
  }

  onOperationCompleted() {
    // If moved, we should probably close the detail view as the card might be gone or changed columns
    if (this.operationAction() === 'move') {
      this.closeModal();
    } else {
      // If copied, just close modal
      this.closeOperationModal();
      // Toast handling is done in service
    }
  }

  // --- Custom Fields Logic ---

  resolvedBoardId(): string {
    return this.activeBoardId()
      || this.card()?.column?.board_id
      || this.resolveBoardIdFromRoute()
      || '';
  }

  private resolveBoardIdFromRoute(): string | null {
    const fromParams = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (fromParams) return fromParams;
    const match = this.router.url.match(/\/board\/([^/?#]+)/);
    return match?.[1] || null;
  }

  private ensureCustomFieldsLoaded(boardId: string) {
    if (!boardId) return;
    this.lastFieldsBoardId = boardId;
    this.loadCustomFields(boardId);

    setTimeout(() => {
      if (this.lastFieldsBoardId === boardId && this.customFields.length === 0) {
        this.loadCustomFields(boardId);
      }
    }, 250);
  }

  loadCustomFields(boardId: string) {
    this.customFieldService.getFields(boardId).subscribe(fields => {
      this.customFields = fields;
    });
  }

  loadCardFieldValues(cardId: string) {
    this.customFieldService.getCardValues(cardId).subscribe(values => {
      this.fieldValues.set(values || []);
    });
  }

  getFieldValue(fieldId: string): any {
    const val = this.fieldValues().find(v => v.custom_field_id === fieldId);
    if (!val) return null;
    if (val.value_text !== undefined && val.value_text !== null) return val.value_text;
    if (val.value_number !== undefined && val.value_number !== null) return val.value_number;
    if (val.value_date !== undefined && val.value_date !== null) return val.value_date;
    if (val.value_bool !== undefined && val.value_bool !== null) return val.value_bool;
    return null;
  }

  updateFieldValue(fieldId: string, value: any) {
    const currentCardId = this.card()?.id;
    if (!currentCardId) return;

    // Optimistic update
    const currentValues = [...this.fieldValues()];
    const existingIndex = currentValues.findIndex(v => v.custom_field_id === fieldId);
    const existing = existingIndex >= 0 ? currentValues[existingIndex] : null;

    // Call API
    let normalizedValue = value;
    if (typeof normalizedValue === 'string') {
      normalizedValue = normalizedValue.trim();
      if (normalizedValue === '') normalizedValue = null;
    }

    this.customFieldService.setValue(currentCardId, fieldId, normalizedValue).subscribe(updatedVal => {
      if (existing) {
        currentValues[existingIndex] = updatedVal;
      } else {
        currentValues.push(updatedVal);
      }
      this.fieldValues.set(currentValues);
    });

    // Update local state immediately for responsiveness
    if (existing) {
      existing.value_text = '';
      existing.value_number = undefined;
      existing.value_date = undefined;
      existing.value_bool = undefined;
      if (typeof normalizedValue === 'boolean') existing.value_bool = normalizedValue;
      else if (typeof normalizedValue === 'number') existing.value_number = normalizedValue;
      else if (typeof normalizedValue === 'string' && !isNaN(Date.parse(normalizedValue)) && normalizedValue.includes('-')) existing.value_date = normalizedValue;
      else existing.value_text = normalizedValue;
      this.fieldValues.set(currentValues);
    } else {
      // We could push a temp value, but since we don't have ID, waiting for API is safer for created_at etc.
      // But for UI responsiveness, we might want to phantom it.
      // For now, let's just rely on the subscription return which is fast.
    }
  }

  getFieldPlaceholder(type: CustomFieldType): string {
    switch (type) {
      case 'text': return 'Type a value';
      case 'number': return 'Enter a number';
      default: return '';
    }
  }

  getFieldHelp(type: CustomFieldType): string {
    switch (type) {
      case 'text': return 'Use short text.';
      case 'number': return 'Only numeric values are accepted.';
      case 'date': return 'Pick a date from the calendar.';
      case 'dropdown': return 'Choose one option.';
      case 'checkbox': return 'Toggle on or off.';
      default: return '';
    }
  }

  resolveFileUrl(path?: string): string {
    return toBackendUrl(path);
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }

  dismissCardSuggestionHint() {
    this.showCardSuggestionHint.set(false);
    this.preferencesService.dismissSuggestion('card_quick_tip');
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}







