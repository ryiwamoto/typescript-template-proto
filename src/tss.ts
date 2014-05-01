
// Copyright (c) Microsoft, Claus Reinke. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

///<reference path='harness.ts'/>
///<reference path='generator.ts'/>

// __dirname + a file to put path references in.. :-(
declare var __dirname : string;

// TS has its own declarations for node-specific stuff, so we
// need to extend those instead of referencing node.d.ts
declare module process {
  export var stdin : any;
}

module MustacheTS{
    /** TypeScript Services Server,
     an interactive commandline tool
     for getting info on .ts projects */
    export class TSS {
        public compilationSettings: TypeScript.CompilationSettings;
        public typescriptLS : Harness.TypeScriptLS;
        public ls : TypeScript.Services.ILanguageService;
        public rootFile : TypeScript.IResolvedFile;
        public resolutionResult : TypeScript.ReferenceResolutionResult;
        private ioHost: TypeScript.IIO;

        constructor (defaultLibs: string, reference: string) {
            this.ioHost = TypeScript.IO;
            this.setup(defaultLibs, reference);
        }

        private fileNameToContent:TypeScript.StringHashTable<string>;

        // IReferenceResolverHost methods (from HarnessCompiler, modulo test-specific code)
        getScriptSnapshot(filename: string): TypeScript.IScriptSnapshot {
            var content = this.fileNameToContent.lookup(filename);
            if (!content) {
                content = readFile(filename).contents;
                this.fileNameToContent.add(filename,content);
            }
            var snapshot = TypeScript.ScriptSnapshot.fromString(content);

            return snapshot;
        }

        resolveRelativePath(path: string, directory?: string): string {
            var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
            var normalizedPath: string;

            if (TypeScript.isRooted(unQuotedPath) || !directory) {
                normalizedPath = unQuotedPath;
            } else {
                normalizedPath = TypeScript.IOUtils.combine(directory, unQuotedPath);
            }

            // get the absolute path
            normalizedPath = TypeScript.IO.resolvePath(normalizedPath);

            // Switch to forward slashes
            normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath)
                .replace(/^(.:)/,function(_,drive?){return drive.toLowerCase()});

            return normalizedPath;
        }

        fileExists(s: string):boolean {
            return TypeScript.IO.fileExists(s);
        }
        directoryExists(path: string): boolean {
            return TypeScript.IO.directoryExists(path);
        }
        getParentDirectory(path: string): string {
            return TypeScript.IO.dirName(path);
        }

        // IDiagnosticReporter
        addDiagnostic(diagnostic: TypeScript.Diagnostic) {
            if (diagnostic.fileName()) {
                var scriptSnapshot = this.getScriptSnapshot(diagnostic.fileName());
                if (scriptSnapshot) {
                    var lineMap = new TypeScript.LineMap(scriptSnapshot.getLineStartPositions, scriptSnapshot.getLength());
                    var lineCol = { line: -1, character: -1 };
                    lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
                    TypeScript.IO.stderr.Write(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): ");
                }
            }

            TypeScript.IO.stderr.WriteLine(diagnostic.message());  // TODO: IO vs ioHost
        }

        /** load file and dependencies, prepare language service for queries */
        private setup(defaultLibs: string, reference: string) {
            this.compilationSettings = new TypeScript.CompilationSettings();
            this.compilationSettings.gatherDiagnostics = true;
            this.compilationSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;

            this.typescriptLS = new Harness.TypeScriptLS();
            this.fileNameToContent = new TypeScript.StringHashTable<string>();

            // chase dependencies (references and imports)
            this.resolutionResult = TypeScript.ReferenceResolver
                .resolve([defaultLibs, reference],this,this.compilationSettings.useCaseSensitiveFileResolution);
            // TODO: what about resolution diagnostics?
            var resolvedFiles = this.resolutionResult.resolvedFiles;

            // remember project root, resolved
            this.rootFile = resolvedFiles[resolvedFiles.length-1];

            // initialize languageService code units
            resolvedFiles.forEach( (code,i) => {
                // this.ioHost.printLine(i+': '+code.path);
                this.typescriptLS.addScript(code.path,this.fileNameToContent.lookup(code.path));
            });

            // Get the language service
            this.ls = this.typescriptLS.getLanguageService().languageService;
            this.ls.refresh();
        }

        public getNavigateToItems(searchValue: string): TypeScript.Services.NavigateToItem[]{
            return this.ls.getNavigateToItems(searchValue);
        }

        public getTypeAtPosition(fileName:string, position:number): TypeScript.Services.TypeInfo{
            return this.ls.getTypeAtPosition(this.resolveRelativePath(fileName), position);
        }

        public addScript(fileName: string){
            var file = this.resolveRelativePath(fileName);
            var content = readFile(file).contents;
            this.fileNameToContent.add(file,content);
        }
    }
}
