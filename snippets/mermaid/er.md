```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER {
        int id
        string status
    }
```
