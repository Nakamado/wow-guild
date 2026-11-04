/**
 * Stylelint: SCSS-Standardregeln + BEM-Prüfung.
 * Klassennamen: block, block__element, block--modifier, block__element--modifier
 * (kebab-case). Globale Ausnahmen: Layout-Primitive und Zustandsklassen.
 */
const kebab = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*'
const bemClass = `^${kebab}(?:__${kebab})?(?:--${kebab})?$`

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-html/vue'],
  rules: {
    'selector-class-pattern': [
      bemClass,
      { message: selector => `"${selector}" folgt nicht der BEM-Konvention (block__element--modifier)` },
    ],
    // Verschachtelung flach halten
    'max-nesting-depth': [3, { ignore: ['blockless-at-rules', 'pseudo-classes'] }],
    'selector-max-id': 0,
    // Tokens werden in thematischen Gruppen mit Leerzeilen notiert
    'custom-property-empty-line-before': null,
    'declaration-no-important': true,
    // Vue-spezifische Pseudo-Selektoren
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep', 'global', 'slotted'] }],
    // Custom-Property-Namen wie --color-surface-raised
    'custom-property-pattern': `^${kebab}$`,
    'scss/dollar-variable-pattern': `^${kebab}$`,
    'scss/at-mixin-pattern': `^${kebab}$`,
    'scss/at-function-pattern': `^${kebab}$`,
    'keyframes-name-pattern': `^${kebab}$`,
    // Fontsource-Familiennamen enthalten Leerzeichen und werden bewusst gequotet
    'font-family-name-quotes': 'always-where-recommended',
    // Vendor-Präfix für line-clamp / text-size-adjust bewusst
    'property-no-vendor-prefix': [true, { ignoreProperties: ['text-size-adjust', 'box-orient', 'line-clamp'] }],
    'value-no-vendor-prefix': [true, { ignoreValues: ['box'] }],
  },
}
