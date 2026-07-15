import { describe, it, expect } from 'vitest';
import { pautaAppTemplates, pautaModuleRegistry, validatePautaModuleConfig, pautaModuleTypes } from './pauta-module-registry';

describe('catálogo de pauta', () => {
  it('é fechado e sem código configurável', () => {
    expect(Object.keys(pautaModuleRegistry)).toHaveLength(18);
    expect(validatePautaModuleConfig('map', { html: '<script>' }).success).toBe(false);
  });

  it('todos os tipos atuais são únicos e estão no registro', () => {
    const expectedTypes = [
      "overview", "construction_circle", "reports", "evidence", "map", "observatory",
      "metrics", "documents", "timeline", "proposals", "actions", "tasks",
      "calendar", "results", "archive", "participation", "art_gallery", "community_radio"
    ];
    expect(pautaModuleTypes).toHaveLength(expectedTypes.length);
    expect(Object.keys(pautaModuleRegistry)).toHaveLength(expectedTypes.length);
    
    for (const type of expectedTypes) {
      expect(pautaModuleTypes).toContain(type);
      expect(pautaModuleRegistry[type as any]).toBeDefined();
    }

    // Unicidade garantida por Set
    const uniqueTypes = new Set(pautaModuleTypes);
    expect(uniqueTypes.size).toBe(pautaModuleTypes.length);
  });

  it('não deve conter tipos futuros antigos ou componentes arbitrários', () => {
    expect(pautaModuleRegistry['art_gallery_future' as any]).toBeUndefined();
    expect(pautaModuleRegistry['community_radio_future' as any]).toBeUndefined();
    expect(pautaModuleTypes).not.toContain('art_gallery_future');
    expect(pautaModuleTypes).not.toContain('community_radio_future');
  });

  it('rejeita tipos desconhecidos e configurações inválidas', () => {
    expect(() => validatePautaModuleConfig('unknown_type' as any, {})).toThrow();
    
    // Configurações inválidas que devem falhar no Zod
    expect(validatePautaModuleConfig('map', { layerIds: 'not-an-array' }).success).toBe(false);
    expect(validatePautaModuleConfig('archive', { limit: 6 }).success).toBe(true); // limit 6 is valid (max 24)
    expect(validatePautaModuleConfig('archive', { limit: 100 }).success).toBe(false); // limit 100 is invalid (max 24)
    expect(validatePautaModuleConfig('art_gallery', { limit: -5 }).success).toBe(false); // limit min 1
    expect(validatePautaModuleConfig('community_radio', { limit: 'invalid' }).success).toBe(false);
  });

  it('templates e módulos são válidos, possuem schemas e componentKey correspondente', () => {
    for (const [templateName, modules] of Object.entries(pautaAppTemplates)) {
      for (const moduleType of modules) {
        const entry = pautaModuleRegistry[moduleType];
        // O módulo no template deve existir no registro
        expect(entry).toBeDefined();
        // O componentKey deve ser idêntico ao moduleType
        expect(entry.componentKey).toBe(moduleType);
        // Cada módulo deve ter um schema válido do zod
        expect(entry.configSchema).toBeDefined();
        // Não deve ser aceito HTML/JS na configuração
        expect(validatePautaModuleConfig(moduleType, { html: '<script>' }).success).toBe(false);
      }
    }
  });
});

