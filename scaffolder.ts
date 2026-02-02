#!/usr/bin/env node
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { exec } from "child_process";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { dirname, join } from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { z } from "zod";

// --- CONFIGURACIÓN DE ENTORNO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Intentar cargar .env desde el directorio padre
try {
  dotenv.config({ path: join(__dirname, "../.env") });
} catch (e) {
  console.log(
    "⚠️ No se pudo cargar ../.env, asegúrate de tener GITHUB_TOKEN en tus variables de entorno.",
  );
}

const execAsync = promisify(exec);
const CURRENT_DIR = process.cwd();

// --- 1. DEFINICIÓN DEL SYSTEM PROMPT (CEREBRO MEJORADO) ---
const SYSTEM_PROMPT = `
You are **George's AI Architect (v2.0)**. Your goal is to scaffold Flutter projects following the **"George Stack" Clean Architecture**.

## THE "GEORGE STACK" ARCHITECTURE:
- **Structure:** \`lib/src/{core, features, shared}\`.
- **Core:** \`app\`, \`assets\`, \`config\`, \`constants\`, \`providers\`, \`routing\`, \`services\`, \`theme\`.
- **Shared:** \`widgets\`, \`utils\`, \`extensions\`, \`layout\`, \`presentation\`.
- **Features:** \`data\` (datasources, mappers, models, repos_impl), \`domain\` (entities, repos_iterfaces), \`presentation\` (providers, screens, widgets).
- **Tech Stack:** Flutter Riverpod, GoRouter, Dio, Freezed, Flutter Hooks.

## BEHAVIOR PROTOCOL (Interactive Architect):
1. **Analyze:** When George gives a project idea, BRAINSTORM features.
2. **Clarify Org & Navigation:** 
   - Ask for **Organization Domain** (if not provided).
   - Ask for **Navigation Style**: "Bottom Navigation" (creates tabs), "Drawer", or "Simple/Stack".
   - Ask if they want a dedicated **'home'** feature or if specific features should be the main tabs.
3. **Propose:** Summary: "Plan: Project '[name]' (org: [org], nav: [style]). Features: [list]. Proceed?"
4. **Execute:**
   A. \`flutter_ops\` (create project).
   B. \`scaffold_clean_arch\` (scaffold core, shared, and features with routing).
   C. **Final Report:** explicitly list the dependencies the user MUST install manually.

## STYLE:
Concise. Lead Developer persona.
`;

// --- 2. DEFINICIÓN DE HERRAMIENTAS (SKILLS) ---

// TOOL A: Ejecutor de Comandos Flutter (Simplificado: SOLO CREACIÓN)
const flutterOpsTool = defineTool("flutter_ops", {
  description:
    "Executes Flutter CLI commands. Use this ONLY to create projects.",
  parameters: z.object({
    command: z.enum(["create"]).describe("The command to run"),
    projectName: z.string().describe("The name of the project folder"),
    org: z
      .string()
      .optional()
      .describe("The organization domain (e.g. com.jorgeantonio)"),
  }),
  handler: async ({ command, projectName, org }) => {
    const workingDir = CURRENT_DIR;

    let fullCommand = "";
    if (command === "create") {
      const orgFlag = org ? `--org ${org}` : "";
      fullCommand = `flutter create ${projectName} ${orgFlag}`;
    }

    console.log(`\n⚙️  [System] Ejecutando: ${fullCommand}`);

    try {
      const { stdout } = await execAsync(fullCommand, {
        cwd: workingDir,
        timeout: 300000,
      });
      return { status: "success", output: stdout.slice(0, 300) + "..." };
    } catch (error: any) {
      return { status: "error", message: error.message };
    }
  },
});

// TOOL B: Generador Dinámico de Clean Architecture (SUPER VITAMINADO V2)
const scaffoldArchTool = defineTool("scaffold_clean_arch", {
  description:
    "Generates Clean Architecture structure with core, shared, and feature files.",
  parameters: z.object({
    projectName: z.string().describe("The name of the project folder"),
    features: z
      .array(z.string())
      .describe("List of feature names (e.g. ['auth', 'products'])"),
    navigationType: z
      .enum(["bottom_nav", "drawer", "simple"])
      .describe("Type of main navigation"),
    bottomNavFeatures: z
      .array(z.string())
      .optional()
      .describe("If bottom_nav, which features are tabs?"),
  }),
  handler: async ({
    projectName,
    features,
    navigationType,
    bottomNavFeatures,
  }) => {
    const projectPath = path.join(CURRENT_DIR, projectName);
    const libPath = path.join(projectPath, "lib");
    const srcPath = path.join(libPath, "src");

    // Helpers
    const toPascalCase = (str: string) =>
      str
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
    const toCamelCase = (str: string) =>
      str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    console.log(
      `\n🏗️  [System] Arquitectando ${features.length} features en: ${projectName} (Mode: ${navigationType})...`,
    );

    try {
      // 1. Crear directorios base (Core & Shared)
      const coreFolders = [
        "core/app",
        "core/assets",
        "core/config",
        "core/constants",
        "core/providers",
        "core/routing",
        "core/services",
        "core/theme",
      ];
      const sharedFolders = [
        "shared/widgets",
        "shared/utils",
        "shared/extensions",
        "shared/presentation/screens",
      ];

      [...coreFolders, ...sharedFolders].forEach((folder) => {
        fs.mkdirSync(path.join(srcPath, folder), { recursive: true });
      });

      // 2. GENERAR CORE FILES
      // -- Routes.dart
      const routesContent = `class Routes {
  const Routes._({required this.name, required this.path});
  final String name;
  final String path;

  static Routes get splash => const Routes._(name: 'splash', path: '/splash');
${features
  .map(
    (f) =>
      `  static Routes get ${toCamelCase(f)} => const Routes._(name: '${toCamelCase(f)}', path: '/${f}');`,
  )
  .join("\n")}
}
`;
      fs.writeFileSync(
        path.join(srcPath, "core/routing/routes.dart"),
        routesContent,
      );

      // -- AppRouter.dart (Complex Logic based on NavType)
      let routerContent = "";
      if (navigationType === "bottom_nav") {
        const tabs = bottomNavFeatures || features.slice(0, 3);
        // Ensure we handle the case where no tabs are found or features list is empty
        const validTabs =
          tabs.length > 0
            ? tabs
            : features.length > 0
              ? [features[0]]
              : ["home"];

        routerContent = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'routes.dart';
// Feature imports
${features.map((f) => `import '../../features/${f}/presentation/screens/${f}_screen.dart';`).join("\n")}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<StatefulNavigationShellState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: Routes.${toCamelCase(validTabs[0])}.path,
    routes: [
      StatefulShellRoute.indexedStack(
        key: _shellNavigatorKey,
        builder: (context, state, child) {
          return Scaffold(
            body: child,
            bottomNavigationBar: NavigationBar(
              selectedIndex: state.extra as int? ?? 0, // Simplified
              onDestinationSelected: (index) {
                // TODO: Implement navigation logic
                // const paths = [${validTabs.map((t) => `Routes.${toCamelCase(t)}.path`).join(", ")}];
                // context.go(paths[index]);
              },
              destinations: const [
                ${validTabs.map((t) => `NavigationDestination(icon: Icon(Icons.circle), label: '${toPascalCase(t)}')`).join(",\n                ")}
              ],
            ),
          );
        },
        branches: [
          ${validTabs
            .map(
              (t) => `StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.${toCamelCase(t)}.path,
                name: Routes.${toCamelCase(t)}.name,
                builder: (context, state) => const ${toPascalCase(t)}Screen(),
              ),
            ],
          ),`,
            )
            .join("\n          ")}
        ],
      ),
      // Other routes
      ${features
        .filter((f) => !validTabs.includes(f))
        .map(
          (f) => `GoRoute(
        path: Routes.${toCamelCase(f)}.path,
        name: Routes.${toCamelCase(f)}.name,
        builder: (context, state) => const ${toPascalCase(f)}Screen(),
      ),`,
        )
        .join("\n      ")}
    ],
  );
});
`;
      } else {
        // Simple/Drawer Router
        routerContent = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'routes.dart';
${features.map((f) => `import '../../features/${f}/presentation/screens/${f}_screen.dart';`).join("\n")}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: ${features.length > 0 ? `Routes.${toCamelCase(features[0])}.path` : `'/'`},
    routes: [
      ${features
        .map(
          (f) => `GoRoute(
        path: Routes.${toCamelCase(f)}.path,
        name: Routes.${toCamelCase(f)}.name,
        builder: (context, state) => const ${toPascalCase(f)}Screen(),
      ),`,
        )
        .join("\n      ")}
    ],
  );
});
`;
      }
      fs.writeFileSync(
        path.join(srcPath, "core/routing/app_router.dart"),
        routerContent,
      );

      // -- Constants
      fs.writeFileSync(
        path.join(srcPath, "core/constants/constants.dart"),
        "class AppConstants { static const String appName = 'Sigae Clone'; }",
      );

      // -- Theme
      fs.writeFileSync(
        path.join(srcPath, "core/theme/app_theme.dart"),
        `import 'package:flutter/material.dart';
class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
  );
}`,
      );

      // -- Core App
      const appContent = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../routing/app_router.dart';
import '../theme/app_theme.dart';

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      routerConfig: router,
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
    );
  }
}
`;
      fs.writeFileSync(path.join(srcPath, "core/app/app.dart"), appContent);

      // 3. GENERAR FEATURES
      features.forEach((feat) => {
        const cleanName = feat.toLowerCase().replace(/\s+/g, "_");
        const className = toPascalCase(cleanName);
        const featPath = path.join(srcPath, `features/${cleanName}`);

        // Folders
        [
          "data/datasources",
          "data/mappers",
          "data/models",
          "data/repositories",
          "domain/entities",
          "domain/repositories",
          "presentation/providers",
          "presentation/screens",
          "presentation/widgets",
        ].forEach((f) =>
          fs.mkdirSync(path.join(featPath, f), { recursive: true }),
        );

        // -- Entity
        const entityContent = `class ${className} {
  final String id;
  const ${className}({required this.id});
}`;
        fs.writeFileSync(
          path.join(featPath, `domain/entities/${cleanName}.dart`),
          entityContent,
        );

        // -- Repository Interface
        const repoInterfaceContent = `import '../entities/${cleanName}.dart';
abstract class ${className}Repository {
  Future<${className}> get${className}(String id);
}`;
        fs.writeFileSync(
          path.join(
            featPath,
            `domain/repositories/${cleanName}_repository.dart`,
          ),
          repoInterfaceContent,
        );

        // -- Screen
        const screenContent = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ${className}Screen extends ConsumerWidget {
  const ${className}Screen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('${className}')),
      body: const Center(child: Text('${className} Feature')),
    );
  }
}
`;
        fs.writeFileSync(
          path.join(featPath, `presentation/screens/${cleanName}_screen.dart`),
          screenContent,
        );

        // -- Provider
        const providerContent = `import 'package:riverpod_annotation/riverpod_annotation.dart';

part '${cleanName}_provider.g.dart';

@riverpod
abstract class ${className}Notifier extends _$${className}Notifier {
  @override
  FutureOr<void> build() {}
}
`;
        fs.writeFileSync(
          path.join(
            featPath,
            `presentation/providers/${cleanName}_provider.dart`,
          ),
          providerContent,
        );
      });

      // 4. MAIN.DART
      const mainContent = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/core/app/app.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}
`;
      fs.writeFileSync(path.join(libPath, "main.dart"), mainContent);

      return {
        status: "success",
        message: `Architecture V2 (Mode: ${navigationType}) generated for ${projectName}.`,
      };
    } catch (error: any) {
      return { status: "error", message: error.message };
    }
  },
});

// --- 3. INICIO DEL AGENTE ---
async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ Error: No se encontró GITHUB_TOKEN en el archivo .env");
    process.exit(1);
  }

  const client = new CopilotClient({ githubToken: token });

  console.log("🚀 Iniciando George's Flutter Architect v2.0...");
  await client.start();

  const session = await client.createSession({
    model: "gpt-4o",
    systemMessage: { mode: "replace", content: SYSTEM_PROMPT },
    tools: [flutterOpsTool, scaffoldArchTool],
  });

  try {
    const greeting = await session.sendAndWait(
      {
        prompt:
          "Hola. Preséntate como mi arquitecto de software y pregúntame qué proyecto vamos a construir hoy. Sigue el protocolo de V2.",
      },
      300000,
    );
    if (greeting && greeting.type === "assistant.message") {
      console.log(`\n🤖 Agente: ${greeting.data.content}\n`);
    }
  } catch (err) {
    console.log("Error en saludo inicial:", err);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question("Tú: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        await session.destroy();
        await client.stop();
        rl.close();
        return;
      }
      console.log("...Analizando y procesando...");
      try {
        const event = await session.sendAndWait({ prompt: input }, 300000);
        if (event && event.type === "assistant.message") {
          console.log(`\n🤖 Agente: ${event.data.content}\n`);
        }
      } catch (err) {
        console.error("❌ Error (posible timeout):", err);
      }
      ask();
    });
  };
  ask();
}

main().catch(console.error);
