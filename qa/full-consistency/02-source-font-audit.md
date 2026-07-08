# Source font audit (BEFORE)

|family (first 70ch)|count|verdict|
|---|---|---|
|`-apple-system,BlinkMacSystemFont,`|373|LEGACY (system/serif stack — must resolve to Plex under ds_v2)|
|`var(--serif)`|16|ALLOWED|
|`var(--sans)`|15|ALLOWED|
|`var(--mono)`|12|ALLOWED|
|`var(--font-mono)`|8|ALLOWED|
|`var(--font-sans)`|5|ALLOWED|
|`inherit`|3|LEGACY (system/serif stack — must resolve to Plex under ds_v2)|
|`ui-monospace,Menlo,monospace`|2|LEGACY (system/serif stack — must resolve to Plex under ds_v2)|
|`ui-monospace,`|1|LEGACY (system/serif stack — must resolve to Plex under ds_v2)|

non-token/non-Plex declarations: **379** across page inline CSS — root cause: legacy components declare their own stacks; ds_v2 fonts only reach elements inheriting from body.
