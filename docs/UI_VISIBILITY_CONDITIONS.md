# UI Visibility Conditions

Bedingungen für die Anzeige von Elementen in der Profile-Seite.

## Visibility Table

| Element | hasAcceptedGroup = true | hasAcceptedGroup = false |
|---------|------------------------|-----------------------|
| **Banner** (Warnung fehlende Daten) | Gezeigt (wenn `.pjta-required` existiert) | Nicht gezeigt |
| **Persönliche Daten** | Gezeigt | Gezeigt |
| **AB Gruppen** | Gezeigt | Gezeigt |
| **STAND Gruppen** | Gezeigt | Gezeigt |
| **AA Gruppen** | Gezeigt | **Nicht gezeigt** |

## Konfiguration

Gruppen-Typen werden in `src/utils/config.ts` definiert:

- `GROUP_TYPES_WITH_ACCEPTANCE_FIELD`: Typen mit Akzeptanz-Feld (AB) - erfordert "abgesagt"-Prüfung
- `GROUP_TYPES_AUTO_ACCEPTED`: Typen die automatisch gezählt werden (STAND)
- `GROUP_TYPE_SHORTIES_WITH_ACCEPT`: Alle Typen die zählen (AB + STAND)
- `GROUP_TYPE_SHORTIES_IF_ACCEPTED_GROUP`: Typen die Akzeptanz **benötigen** um sichtbar zu sein (AA)
- `GROUP_TYPE_SHORTIES`: Alle Typen (Union aus oben)

**Logik:**
- `hasAcceptedGroup = true` wenn: 
  - User hat STAND-Gruppe (automatisch) ODER
  - User hat AB-Gruppe die nicht "abgesagt" ist
- Gruppen nur sichtbar wenn: `!GROUP_TYPE_SHORTIES_IF_ACCEPTED_GROUP.includes(type) || hasAcceptedGroup`
  - AA nur wenn `hasAcceptedGroup = true`
  - STAND/AB immer sichtbar
- `showStatus` nur für AB-Gruppen (Anzeige ob abgesagt)
