import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';

import type { ThemePreference } from '@domain/models/theme-preference';
import {
  DEFAULT_AUTO_GRADE_BY_TIME,
  DEFAULT_NEW_CARDS_PER_DAY,
  DEFAULT_PRACTICE_PACKAGE_CAPACITY,
} from '@domain/models/study-defaults';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { DEFAULT_PROMPT_TEMPLATE } from '@services/practice-ai/build-prompt';
import { SessionService } from '@services/session/session.service';
import { deviceTimeZone, supportedTimeZones } from '@services/settings/time-zones';
import { ThemeService } from '@services/theme/theme.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { PRACTICA_IA_COPY } from '../../practica-ia/practica-ia.copy';
import { VersionFooterComponent } from '../../shell/version-footer/version-footer.component';
import { AJUSTES_COPY } from '../ajustes.copy';
import { createImmediateSetting } from '../immediate-setting';
import {
  practiceSettingsFormSchema,
  type PracticeSettingsFormValue,
} from '../practice-settings-form.schema';
import { settingsFormSchema, type SettingsFormValue } from '../settings-form.schema';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Pantalla Ajustes. Regla de guardado: los controles de elección guardan al tocar (con reversión
// si falla) y los campos de texto guardan con su botón (tarjetas nuevas; práctica con IA). Sin red, nada se guarda: los controles se
// deshabilitan y una sola nota lo explica; cerrar sesión sigue disponible.
@Component({
  selector: 'app-ajustes-page',
  imports: [FormField, VersionFooterComponent],
  templateUrl: './ajustes-page.component.html',
  styleUrl: './ajustes-page.component.scss',
})
export class AjustesPageComponent {
  private readonly session = inject(SessionService);
  private readonly logger = inject(Logger);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly copy = AJUSTES_COPY;
  protected readonly user = computed(() => this.session.user());
  protected readonly online = inject(ConnectivityPort).online;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;

  // ── Tarjetas nuevas por día: campo numérico con botón "Guardar".
  private readonly newCardsModel = signal<SettingsFormValue>({
    defaultNewCardsPerDay:
      this.session.user()?.settings.defaultNewCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
  });
  protected readonly settingsForm = form(this.newCardsModel, (path) =>
    validateStandardSchema(path, settingsFormSchema),
  );
  protected readonly newCardsState = signal<SaveState>('idle');
  protected readonly canSaveNewCards = computed(
    () =>
      this.online() &&
      this.newCardsState() !== 'saving' &&
      this.newCardsModel().defaultNewCardsPerDay !== this.user()?.settings.defaultNewCardsPerDay,
  );
  protected readonly showNewCardsInvalid = computed(() => {
    const field = this.settingsForm.defaultNewCardsPerDay();
    return field.touched() && field.invalid();
  });

  // ── Práctica con IA: plantilla del prompt e ítems por paquete, con su botón "Guardar".
  protected readonly practiceCopy = PRACTICA_IA_COPY;
  private readonly savedTemplate = computed(
    () => this.user()?.settings.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE,
  );
  private readonly savedCapacity = computed(
    () => this.user()?.settings.practicePackageCapacity ?? DEFAULT_PRACTICE_PACKAGE_CAPACITY,
  );
  private readonly practiceModel = signal<PracticeSettingsFormValue>({
    promptTemplate: this.savedTemplate(),
    practicePackageCapacity: this.savedCapacity(),
  });
  protected readonly practiceForm = form(this.practiceModel, (path) =>
    validateStandardSchema(path, practiceSettingsFormSchema),
  );
  protected readonly practiceState = signal<SaveState>('idle');
  protected readonly templateInvalid = computed(() => {
    const field = this.practiceForm.promptTemplate();
    return field.dirty() && field.invalid();
  });
  protected readonly capacityInvalid = computed(() => {
    const field = this.practiceForm.practicePackageCapacity();
    return field.dirty() && field.invalid();
  });
  protected readonly canSavePractice = computed(() => {
    const { promptTemplate, practicePackageCapacity } = this.practiceModel();
    const changed =
      promptTemplate !== this.savedTemplate() || practicePackageCapacity !== this.savedCapacity();
    return (
      this.online() && this.practiceState() !== 'saving' && this.practiceForm().valid() && changed
    );
  });

  protected restoreTemplate(): void {
    this.practiceModel.update((value) => ({ ...value, promptTemplate: DEFAULT_PROMPT_TEMPLATE }));
    this.resetPracticeResult();
  }

  protected resetPracticeResult(): void {
    if (this.practiceState() !== 'saving') {
      this.practiceState.set('idle');
    }
  }

  /** La plantilla por defecto se guarda como ausente: así le llegan sus mejoras futuras. */
  protected async savePractice(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSavePractice()) {
      return;
    }
    await submit(this.practiceForm, async () => {
      this.practiceState.set('saving');
      const { promptTemplate, practicePackageCapacity } = this.practiceModel();
      try {
        await this.session.updateSettings({
          promptTemplate: promptTemplate === DEFAULT_PROMPT_TEMPLATE ? null : promptTemplate,
          practicePackageCapacity,
        });
        this.practiceState.set('saved');
      } catch (error) {
        this.logger.error('No se pudieron guardar los ajustes de práctica con IA', error);
        this.practiceState.set('error');
      }
      return undefined;
    });
  }

  // ── Controles de elección: guardan al tocar y vuelven al valor guardado si falla.
  protected readonly autoGrade = createImmediateSetting(
    () => this.user()?.settings.autoGradeByTime ?? DEFAULT_AUTO_GRADE_BY_TIME,
    (autoGradeByTime) => this.session.updateSettings({ autoGradeByTime }),
    this.logger,
  );

  protected async changeAutoGrade(event: Event): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    await this.autoGrade.change(checkbox.checked);
    // Tras un fallo el valor vuelve al guardado: la casilla nativa también.
    checkbox.checked = this.autoGrade.value();
  }

  protected readonly timeZone = createImmediateSetting(
    () => this.user()?.settings.timezone ?? deviceTimeZone(),
    (timezone) => this.session.updateSettings({ timezone }),
    this.logger,
  );
  protected readonly timeZones = computed(() => supportedTimeZones(this.timeZone.value()));
  protected readonly deviceZone = deviceTimeZone();
  /** Nunca se cambia sola: si el dispositivo está en otra zona, solo se avisa y se ofrece. */
  protected readonly deviceZoneDiffers = computed(
    () => this.deviceZone !== this.user()?.settings.timezone,
  );

  protected readonly dayStartHour = createImmediateSetting(
    () => this.user()?.settings.dayStartHour ?? 0,
    (dayStartHour) => this.session.updateSettings({ dayStartHour }),
    this.logger,
  );
  protected readonly hours = Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: `${String(hour).padStart(2, '0')}:00`,
  }));

  protected async changeTimeZone(event: Event): Promise<void> {
    const control = event.target as HTMLSelectElement;
    await this.timeZone.change(control.value);
    control.value = this.timeZone.value();
  }

  protected async useDeviceZone(): Promise<void> {
    await this.timeZone.change(this.deviceZone);
  }

  protected async changeDayStartHour(event: Event): Promise<void> {
    const control = event.target as HTMLSelectElement;
    await this.dayStartHour.change(Number(control.value));
    control.value = String(this.dayStartHour.value());
  }

  protected readonly theme = createImmediateSetting<ThemePreference>(
    () => this.user()?.settings.theme ?? 'system',
    (theme) => this.session.updateSettings({ theme }),
    this.logger,
  );
  /** El orden visible: oscuro primero (la identidad de Cadence), luego claro y sistema. */
  protected readonly themeOptions: readonly ThemePreference[] = ['dark', 'light', 'system'];

  /** El documento cambia al tocar; si el guardado falla, vuelve al tema guardado. */
  protected async chooseTheme(theme: ThemePreference): Promise<void> {
    if (theme === this.theme.value()) {
      return;
    }
    this.themeService.preference.set(theme);
    await this.theme.change(theme);
    this.themeService.preference.set(this.theme.value());
  }

  // ── Cerrar sesión: local, funciona también sin red.
  protected readonly signingOut = signal(false);

  protected async signOut(): Promise<void> {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);
    try {
      await this.session.signOut();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }

  /** Escribir oculta el resultado del guardado anterior. */
  protected resetNewCardsResult(): void {
    this.newCardsState.set('idle');
  }

  /** Un valor inválido solo se marca; uno igual al guardado o en pleno guardado no se envía. */
  protected async saveNewCards(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSaveNewCards()) {
      return;
    }
    await submit(this.settingsForm, async () => {
      this.newCardsState.set('saving');
      try {
        await this.session.updateSettings({
          defaultNewCardsPerDay: this.newCardsModel().defaultNewCardsPerDay,
        });
        this.newCardsState.set('saved');
      } catch (error) {
        this.logger.error('No se pudo guardar el default de tarjetas nuevas', error);
        this.newCardsState.set('error');
      }
      return undefined;
    });
  }
}
