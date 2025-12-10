# Nuevas Funcionalidades - Sistema de Gestión de Proyectos

## Resumen

Se ha integrado un sistema completo de gestión de proyectos con tareas jerárquicas, progreso por departamento y versiones de proyectos.

## Características Implementadas

### 1. Gestión de Proyectos
- **Crear proyectos** con nombre, descripción, fecha de inicio y fin
- **Ver lista de proyectos** en el Dashboard
- **Acceder a detalles** haciendo clic en las tarjetas de proyecto
- Proyectos se muestran con progreso visual por departamento

### 2. Sistema de Tareas Jerárquicas
- **Crear tareas** dentro de proyectos
- **Crear sub-tareas** desde cualquier tarea (ilimitado niveles)
- **Árbol expandible/colapsable** para navegar la jerarquía
- Visualización con indentación para mostrar la estructura

### 3. Estados de Tareas
- **Pendiente** (estado inicial)
- **En Progreso** (cuando se inicia)
- **Completada** (tarea finalizada)
- **Cancelada** (tarea que no se realizará)
- Cambios de estado con botones de acción rápida

### 4. Asignación y Organización
- Asignar tareas a usuarios específicos
- Los usuarios pertenecen a departamentos
- Mostrar nombre de usuario y departamento en cada tarea
- Filtrado por prioridad (Alta, Media, Baja)

### 5. Progreso por Departamento
- **Cálculo de progreso por DEPARTAMENTO** (no por usuario individual)
- Barras de progreso con colores distintivos por departamento
- Métricas: completadas, en progreso, pendientes, canceladas
- Evita competitividad entre individuos

### 6. Sistema de Versiones
- **Crear snapshots** del estado actual del proyecto
- Cada versión guarda:
  - Nombre de la versión
  - Estado completo de todas las tareas
  - Fecha y hora de creación
  - Usuario que creó la versión
- **Historial de versiones** para ver estados anteriores
- Visualizar contenido de cada versión histórica

## Estructura de la Base de Datos

### Tablas Nuevas/Actualizadas

```sql
-- Departamentos
departments (id, name, color, created_at)

-- Usuarios (actualizada)
users (id, username, email, password_hash, role, department_id, active, created_at)

-- Proyectos
projects (id, name, description, start, end, created_at, updated_at)

-- Tareas con jerarquía
tasks (
  id,
  project_id,
  parent_task_id,  -- Para jerarquía
  title,
  description,
  assigned_to,
  status,
  priority,
  due,
  effort,
  department_id,
  created_at,
  updated_at
)

-- Versiones de proyectos
project_versions (
  id,
  project_id,
  version_name,
  snapshot_data,  -- JSON con estado completo
  created_by,
  created_at
)
```

## API Endpoints

### Departamentos
- `GET /api/departments` - Listar departamentos
- `POST /api/departments` - Crear departamento

### Proyectos
- `GET /api/projects` - Listar todos los proyectos
- `GET /api/projects/:id` - Obtener un proyecto
- `POST /api/projects` - Crear proyecto
- `PUT /api/projects/:id` - Actualizar proyecto

### Tareas
- `GET /api/tasks` - Listar todas las tareas
- `GET /api/projects/:id/tasks` - Tareas de un proyecto
- `GET /api/tasks/:id/subtasks` - Subtareas de una tarea
- `POST /api/tasks` - Crear tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea (y subtareas)

### Progreso
- `GET /api/projects/:id/progress` - Progreso por departamento

### Versiones
- `GET /api/projects/:id/versions` - Historial de versiones
- `POST /api/projects/:id/versions` - Crear nueva versión

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

## Componentes Frontend

### 1. Dashboard (actualizado)
- `/` - Vista principal
- Botón para crear nuevos proyectos
- Tarjetas de proyecto clickeables
- Modal para crear proyectos

### 2. ProjectDetail
- `/projects/:id` - Detalles del proyecto
- Vista de tareas jerárquicas
- Progreso por departamento
- Crear tareas y subtareas
- Cambiar estados de tareas
- Acceso a historial de versiones
- Botón para guardar versiones

### 3. VersionHistory
- `/projects/:id/versions` - Historial de versiones
- Lista de todas las versiones guardadas
- Vista detallada de cada versión
- Estadísticas de tareas por versión

## Datos de Prueba

El sistema incluye datos de prueba automáticos:

### Departamentos
- Desarrollo (#3b82f6)
- Diseño (#8b5cf6)
- Marketing (#ec4899)
- Operaciones (#10b981)

### Usuarios (password: 123456)
- cmendoza - Desarrollo
- agarcia - Desarrollo
- ltorres - Diseño
- mlopez - Diseño
- pramirez - Marketing
- shernandez - Operaciones

### Proyectos de Ejemplo
1. Sistema de Gestión
2. Aplicación Móvil

Con tareas y subtareas pre-configuradas.

## Flujo de Usuario

1. **Login** con uno de los usuarios de prueba
2. **Ver Dashboard** con proyectos existentes
3. **Crear nuevo proyecto** desde el botón en Dashboard
4. **Hacer clic en un proyecto** para ver detalles
5. **Crear tareas** desde el botón "Nueva Tarea"
6. **Cambiar estados** con los botones de acción
7. **Crear subtareas** desde el botón "+" en cada tarea
8. **Ver progreso** por departamento en la parte superior
9. **Guardar versión** cuando se alcance un hito
10. **Ver historial** desde el botón de versiones

## Diseño Visual

- **Dark theme** moderno (#0b1221 background)
- **Glassmorphism** en tarjetas y paneles
- **Gradientes** vibrantes en botones (#22d3ee to #6366f1)
- **Animaciones** suaves (transitions 250ms)
- **Colores por departamento** para mejor identificación
- **Estados visuales** con badges de colores:
  - Pendiente: Gris
  - En Progreso: Azul
  - Completada: Verde
  - Cancelada: Rojo

## Tecnologías Utilizadas

### Backend
- Node.js + Express
- MySQL (compatible con MariaDB)
- bcryptjs para passwords
- crypto para UUIDs

### Frontend
- Angular 21 (standalone components)
- Signals para reactividad
- RouterLink para navegación
- FormsModule para formularios

## Iniciar el Sistema

```bash
# Backend (Puerto 3000)
npm run api

# Frontend (Puerto 4200)
npm start
```

Acceder a: http://localhost:4200

## Credenciales de Prueba

Usuario: `cmendoza`
Password: `123456`

(O cualquiera de los usuarios listados arriba)

## Notas Importantes

- El progreso se calcula por DEPARTAMENTO, no por usuario individual
- Las tareas pueden tener niveles ilimitados de sub-tareas
- Al eliminar una tarea, se eliminan todas sus subtareas
- Las versiones son snapshots inmutables del estado del proyecto
- Los datos de prueba se insertan automáticamente si la DB está vacía
