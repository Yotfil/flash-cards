import { Component, computed, inject, type OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import type { CardContentDraft, CardFace } from '@domain/models/card.model';
import {
  orderedItems,
  type PracticeItem,
  type PracticePackage,
} from '@domain/models/practice-package';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { PackageCompletedError } from '@domain/ports/practice-package.repository';
import { clozeQuestion } from '@services/cards/cloze/parse-cloze';
import { todayItemIds } from '@services/practice-ai/pending-items';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '@shared/confirm-dialog/confirm-dialog.component';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import {
  ActionMenuComponent,
  type ActionMenuItem,
} from '@shared/menu/action-menu/action-menu.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import {
  CardFormDialogComponent,
  type CardFormDialogData,
} from '../../biblioteca/card-form-dialog/card-form-dialog.component';
import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import {
  CardImportDialogComponent,
  type CardImportDialogData,
} from '../../importacion/card-import-dialog/card-import-dialog.component';
import { CopyPromptButtonComponent } from '../copy-prompt-button/copy-prompt-button.component';
import {
  PackageFormDialogComponent,
  type PackageFormDialogData,
} from '../package-form-dialog/package-form-dialog.component';
import {
  PRACTICA_IA_COPY,
  deletePackageMessage,
  itemsLabel,
  lastGradeLabel,
  remainingLabel,
} from '../practica-ia.copy';

type DetailView = 'loading' | 'error' | 'notFound' | 'package';

const PACKAGE_MENU: readonly ActionMenuItem[] = [
  { id: 'rename', label: PRACTICA_IA_COPY.rename, icon: 'edit' },
  { id: 'delete', label: PRACTICA_IA_COPY.delete, icon: 'trash', destructive: true },
];
const ITEM_MENU: readonly ActionMenuItem[] = [
  { id: 'edit', label: PRACTICA_IA_COPY.edit, icon: 'edit' },
  { id: 'delete', label: PRACTICA_IA_COPY.delete, icon: 'trash', destructive: true },
];

/** Cómo se nombra lo que entra en un paquete en la previsualización de importar. */
const ITEM_WORDING = {
  one: 'ítem',
  many: 'ítems',
  repeatedOne: 'repetido',
  repeatedMany: 'repetidos',
  repeatedNote: 'Se agregarán igual.',
} as const;

// Detalle de un paquete de práctica: su nombre, "ítems / capacidad", lo de hoy y la lista de
// ítems. Abierto: practicar, agregar, importar, copiar el prompt de hoy y completar. Completado:
// solo lectura y copiar con todos. Sin red, practicar y copiar siguen; la gestión se deshabilita.
@Component({
  selector: 'app-package-detail-page',
  imports: [
    RouterLink,
    ActionMenuComponent,
    CopyPromptButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    StudyLaunchButtonComponent,
  ],
  templateUrl: './package-detail-page.component.html',
  styleUrl: './package-detail-page.component.scss',
})
export class PackageDetailPageComponent implements OnInit {
  protected readonly packages = inject(PracticePackagesService);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly online = inject(ConnectivityPort).online;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly packageMenu = PACKAGE_MENU;
  protected readonly itemMenu = ITEM_MENU;
  protected readonly practiceDestination = ['/practica-ia'];

  private readonly packageId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );
  protected readonly pkg = computed(() => this.packages.findById(this.packageId()));
  protected readonly view = computed<DetailView>(() => {
    if (this.packages.status() === 'error') {
      return 'error';
    }
    const pkg = this.pkg();
    if (pkg === undefined) {
      return 'loading';
    }
    return pkg === null ? 'notFound' : 'package';
  });
  protected readonly isOpen = computed(() => this.pkg()?.status === 'open');
  protected readonly countText = computed(() => {
    const pkg = this.pkg();
    return pkg ? itemsLabel(pkg.itemOrder.length, pkg.capacity) : '';
  });
  protected readonly remaining = computed(() => {
    const pkg = this.pkg();
    return pkg ? pkg.capacity - pkg.itemOrder.length : 0;
  });
  protected readonly isFull = computed(() => this.remaining() <= 0);
  private readonly faces = computed<CardFace[]>(() => {
    const pkg = this.pkg();
    return pkg ? orderedItems(pkg) : [];
  });
  protected readonly items = computed(() => {
    const pkg = this.pkg();
    if (!pkg) {
      return [];
    }
    const today = new Set(pkg.status === 'open' ? this.todayIds(pkg) : []);
    const todayId = this.packages.currentDayId();
    return orderedItems(pkg).map((item) => ({
      item,
      text: itemText(item),
      status: this.itemStatus(item, today.has(item.id), todayId),
    }));
  });
  /** Hoy ya practicado (abierto) o completado: entonces hay prompt que copiar. */
  protected readonly prompt = computed(() => {
    const pkg = this.pkg();
    if (!pkg || (pkg.status === 'open' && !this.packages.practicedToday(pkg))) {
      return null;
    }
    return this.packages.promptFor(pkg.id);
  });
  protected readonly completedText = computed(() => {
    const completedAt = this.pkg()?.completedAt;
    return completedAt ? this.copy.completedOn(completedAt.toLocaleDateString('es')) : '';
  });
  protected readonly preparePractice = () => this.packages.prepareTodayPractice(this.packageId());
  protected readonly discardPractice = () => this.packages.discardPrepared();

  ngOnInit(): void {
    this.packages.reload();
  }

  protected retry(): void {
    this.packages.reload();
  }

  /** Otro dispositivo pudo completar el paquete mientras este lo veía abierto: se dice así. */
  private readonly explainAddFailure = (error: unknown): string | undefined =>
    error instanceof PackageCompletedError ? this.copy.packageCompleted : undefined;

  protected addItem(pkg: PracticePackage): void {
    this.dialogs.open<undefined, CardFormDialogData>(CardFormDialogComponent, {
      label: this.copy.itemFormCreate,
      size: 'lg',
      data: {
        mode: 'create',
        save: async (draft) => {
          await this.packages.addItems(pkg.id, [draft]);
        },
        failureMessage: this.explainAddFailure,
        existing: { cards: this.faces, message: this.copy.duplicate },
      },
    });
  }

  protected importItems(pkg: PracticePackage): void {
    this.dialogs.open<boolean, CardImportDialogData>(CardImportDialogComponent, {
      label: this.copy.importTitle,
      size: 'lg',
      data: {
        target: {
          kind: 'package',
          packageName: pkg.name,
          existing: this.faces,
          remaining: this.remaining(),
          save: async (drafts: readonly CardContentDraft[]) => {
            await this.packages.addItems(pkg.id, drafts);
          },
          failureMessage: this.explainAddFailure,
          texts: {
            title: this.copy.importTitle,
            remaining: remainingLabel(this.remaining()),
            error: this.copy.importError,
            wording: ITEM_WORDING,
          },
        },
      },
    });
  }

  protected complete(pkg: PracticePackage): void {
    this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.completeTitle,
      size: 'sm',
      data: {
        title: this.copy.completeTitle,
        message: this.copy.completeConfirm,
        confirmLabel: this.copy.complete,
        pendingLabel: this.copy.completing,
        errorMessage: this.copy.completeError,
        action: () => this.packages.complete(pkg.id),
      },
    });
  }

  protected runPackageAction(action: string, pkg: PracticePackage): void {
    if (action === 'rename') {
      this.dialogs.open<PracticePackage, PackageFormDialogData>(PackageFormDialogComponent, {
        label: this.copy.packageForm.renameTitle,
        size: 'sm',
        data: { mode: 'rename', pkg },
      });
      return;
    }
    void this.confirmDeletePackage(pkg);
  }

  protected runItemAction(action: string, pkg: PracticePackage, item: PracticeItem): void {
    if (action === 'edit') {
      this.dialogs.open<undefined, CardFormDialogData>(CardFormDialogComponent, {
        label: this.copy.edit,
        size: 'lg',
        data: {
          mode: 'edit',
          card: item,
          save: (draft) => this.packages.updateItem(pkg.id, item.id, draft),
        },
      });
      return;
    }
    this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteItemTitle,
      size: 'sm',
      data: {
        title: this.copy.deleteItemTitle,
        message: this.copy.deleteItemMessage,
        confirmLabel: this.copy.deleteConfirm,
        pendingLabel: this.copy.deleting,
        errorMessage: this.copy.deleteItemError,
        action: () => this.packages.removeItem(pkg.id, item.id),
      },
    });
  }

  private async confirmDeletePackage(pkg: PracticePackage): Promise<void> {
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteTitle,
      size: 'sm',
      data: {
        title: this.copy.deleteTitle,
        message: deletePackageMessage(pkg.itemOrder.length),
        confirmLabel: this.copy.deleteConfirm,
        pendingLabel: this.copy.deleting,
        errorMessage: this.copy.deleteError,
        action: () => this.packages.remove(pkg.id),
      },
    });
    if (await ref.closed) {
      await this.router.navigate(['/biblioteca']);
    }
  }

  private todayIds(pkg: PracticePackage): string[] {
    return todayItemIds(pkg, this.packages.currentDayId());
  }

  /**
   * Lo que se dice de un ítem: su nota si ya se calificó hoy ("Otra vez · hoy"), aunque sea del
   * día; "Para hoy" si es del día y falta; y si no, su última nota ("Bien · ayer").
   */
  private itemStatus(item: PracticeItem, isForToday: boolean, todayId: string): string {
    const gradedToday = item.lastPracticedDayId === todayId;
    if (isForToday && !gradedToday) {
      return this.copy.forToday;
    }
    return item.lastGrade && item.lastPracticedDayId
      ? lastGradeLabel(item.lastGrade, item.lastPracticedDayId, todayId)
      : '';
  }
}

/** "anverso → reverso"; una cloze, con sus huecos como en la pregunta. */
function itemText(item: PracticeItem): string {
  return item.cardType === 'cloze' ? clozeQuestion(item.front) : `${item.front} → ${item.back}`;
}
