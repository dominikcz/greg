```mermaid
sequenceDiagram
    Browser->>Server: GET /page
    Server-->>Browser: 200 OK
    Browser->>Browser: fetch markdown
    Browser-->>Browser: render
```
