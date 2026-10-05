# Cambiar el nombre o la dirección del correo ComercialDomus1

> **Resultado final:** el correo quedó como `comercial@hoyosluque.com` y el nombre como **Hotel Dammai**.
>
> En Mailchimp usar: **From name:** Hotel Dammai · **From email:** `comercial@hoyosluque.com`. ✅ Dominio `hoyosluque.com` verificado y autenticado en Mailchimp.

Sí, se puede. Y no cuesta nada, porque se sigue usando la misma licencia.

Hay dos cosas distintas que se pueden cambiar. Te explico las dos para que elijas.

## Opción A – Cambiar solo el nombre que se ve (lo más fácil)

Esto cambia lo que ven las personas cuando reciben un correo: en vez de "ComercialDomus1" verán, por ejemplo, "Dammai Lifestyle Hotel". La dirección sigue siendo `comercialdomus1@hoyosluque…`.

Lo puede hacer el mismo usuario desde Gmail:

1. Entra al Gmail de ComercialDomus1.
2. Arriba a la derecha, haz clic en ⚙️ → **Ver todos los ajustes**.
3. Pestaña **Cuentas** (Accounts).
4. En **"Enviar como"** (Send mail as), al lado del correo, haz clic en **editar información**.
5. En **Nombre**, escribe el nuevo, por ejemplo *Dammai Lifestyle Hotel* → **Guardar cambios**.

✅ No necesitas ser administrador.

## Opción B – Cambiar la dirección de correo completa

Por ejemplo, que `comercialdomus1@hoyosluque…` pase a ser `dammai@hoyosluque…`.

Esto solo lo puede hacer el administrador del Google Workspace de Hoyos Luque:

1. Entrar a [admin.google.com](https://admin.google.com).
2. **Directorio → Usuarios** → hacer clic en **ComercialDomus1**.
3. Arriba, **Cambiar nombre del usuario** (Rename user).
4. Escribir el nuevo nombre, apellido y la nueva dirección (por ejemplo `dammai`) → **Cambiar nombre**.

Qué pasa después:

- ✅ No se pierde nada: correos, archivos de Drive y contactos siguen ahí.
- ✅ La dirección vieja sigue funcionando como alias. Lo que envíen a `comercialdomus1@…` sigue llegando.
- ⚠️ Desde ese momento hay que iniciar sesión con la dirección nueva, también en el celular. El cambio puede tardar unos minutos en aplicarse.

## Opción C – Agregar una dirección extra, sin cambiar nada

Si no quieren tocar ComercialDomus1 (porque alguien más la usa o está impresa en tarjetas), el administrador puede agregarle un alias:

[admin.google.com](https://admin.google.com) → **Directorio → Usuarios → ComercialDomus1** → a la izquierda, debajo del nombre, **Agregar correos alternativos** (*Add Alternate Emails*) → **Correo alternativo** → escribir `dammai` → **Guardar**.

Es gratis (hasta 30 alias por usuario) y puede tardar hasta 24 horas en funcionar, aunque normalmente es más rápido.

Así el buzón recibe correos en las dos direcciones, y se puede enviar como `dammai@…` agregándola en Gmail → ⚙️ → **Cuentas → Enviar como → Añadir otra dirección**.

## Mi recomendación

- Si solo te molesta el nombre que ven los demás → **Opción A** (2 minutos, sin administrador).
- Si quieres una dirección bonita → **Opción C** (alias), que no rompe nada de lo que ya existe.

## Si los correos se envían desde Mailchimp

Las opciones A y B no sirven en este caso. Mailchimp no usa el nombre que tiene la cuenta en Gmail ni en el administrador de Google Workspace. Solo usa la **dirección** (`comercialdomus1@…`), y el nombre que ven los destinatarios se configura en Mailchimp:

- **Nombre por defecto de la audiencia:** Audience → **Settings → Audience name and defaults** → **Default From name** → *Dammai Lifestyle Hotel* → Save.
- **En cada campaña:** en el editor de la campaña, sección **From** → **Edit** → **Name** → *Dammai Lifestyle Hotel*.
- **En automatizaciones (Customer Journeys):** cada correo tiene su propio "From". Hay que cambiarlo en cada uno.

Si además se quiere una dirección más bonita (por ejemplo `dammai@…`), el administrador la crea como alias (Opción C) y después se pone esa dirección en el campo **From email** de Mailchimp.

⚠️ Para que los correos no lleguen a spam, el dominio `hoyosluque…` tiene que estar autenticado en Mailchimp (ícono de perfil → **Account & billing → Domains** → **Authenticate**). Esto pide agregar unos registros DNS, y lo tiene que hacer quien maneje el dominio.
