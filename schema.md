# Family Graph Data Schema

## Node Properties

```json
{
  "id": "ii0000",
  "name": "Gaurav Ameta",
  "gender": "M",          // "M" | "F" | null
  "birthYear": 1985,      // optional - used for seniority (elder/younger)
  "birthOrder": 2,        // optional - position among siblings (alternative to birthYear)
  "gotra": "Kashyap",     // optional - patrilineal clan (auto-derived from father if not set)
  "nativeTown": "Bagidora" // optional - ancestral town/village (inherits via patrilineage)
}
```

## Edge Types

### Core edges (stored in graph-data.json)
| Type | Meaning |
|------|---------|
| `isFatherOf` | Biological father → child |
| `isMotherOf` | Biological mother → child |
| `isSpouseOf` | Marriage link (bidirectional) |
| `isAdoptiveFatherOf` | Adoptive father → adopted child |
| `isAdoptiveMotherOf` | Adoptive mother → adopted child |

### Derived relationships (computed by path-walker, never stored)
Everything else (uncle, cousin, grandparent, sadhu, salhaj, etc.) is derived
from the path between two people + the kinship rule engine.

## Multiple Spouses

A person can have multiple spouse edges. The graph handles this naturally:
```json
{ "source": "ii0050", "type": "isSpouseOf", "target": "ii0051" }
{ "source": "ii0050", "type": "isSpouseOf", "target": "ii0052" }
```

## Polyandry

Same as above but reversed - a woman with multiple husband edges:
```json
{ "source": "ii0060", "type": "isSpouseOf", "target": "ii0061" }
{ "source": "ii0060", "type": "isSpouseOf", "target": "ii0062" }
```

## Adoption

Use `isAdoptiveFatherOf` / `isAdoptiveMotherOf` edges. The adopted child
will have both biological parents AND adoptive parents in their parent list.
The gotra/native town will derive from the adoptive father's line.

## Gotra Rules

- Males inherit gotra from their father (patrilineal)
- If gotra is explicitly set on a node, that takes precedence
- If not set, system traces up the patrilineal chain until it finds one
- Fallback: uses last word of the name (surname) as proxy

## Native Town Rules

- Inherits via patrilineage (same as gotra)
- Represents the last known ancestral village/town
- Example: "Kashyap gotra from Bagidora", "Vatsa gotra from Navania"
