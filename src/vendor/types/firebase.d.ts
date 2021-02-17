/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

type FirebaseOptions = {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

interface FirebaseAppConfig {
  name?: string;
  automaticDataCollectionEnabled?: boolean;
}

declare class FirebaseApp {
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  options: FirebaseOptions;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;

  /**
   * Make the given App unusable and free resources.
   */
  delete(): Promise<void>;
}

interface FirebaseNamespace {
  database(): FirebaseDatabase;
  analytics(): any;
  /**
   * Create (and initialize) a FirebaseApp.
   *
   * @param options Options to configure the services used in the App.
   * @param config The optional config for your firebase app
   */
  initializeApp(
    options: FirebaseOptions,
    config?: FirebaseAppConfig
  ): FirebaseApp;
  /**
   * Create (and initialize) a FirebaseApp.
   *
   * @param options Options to configure the services used in the App.
   * @param name The optional name of the app to initialize ('[DEFAULT]' if
   * omitted)
   */
  initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;

  app: {
    /**
     * Retrieve an instance of a FirebaseApp.
     *
     * Usage: firebase.app()
     *
     * @param name The optional name of the app to return ('[DEFAULT]' if omitted)
     */
    (name?: string): FirebaseApp;

    /**
     * For testing FirebaseApp instances:
     *  app() instanceof firebase.app.App
     *
     * DO NOT call this constuctor directly (use firebase.app() instead).
     */
    App: typeof FirebaseApp;
  };

  /**
   * A (read-only) array of all the initialized Apps.
   */
  apps: FirebaseApp[];

  /**
   * Registers a library's name and version for platform logging purposes.
   * @param library Name of 1p or 3p library (e.g. firestore, angularfire)
   * @param version Current version of that library.
   */
  registerVersion(library: string, version: string, variant?: string): void;

  // The current SDK version.
  SDK_VERSION: string;
}

interface VersionService {
  library: string;
  version: string;
}

interface DataSnapshot {
  child(path: string): DataSnapshot;
  exists(): boolean;
  exportVal(): any;
  forEach(action: (a: DataSnapshot) => boolean | void): boolean;
  getPriority(): string | number | null;
  hasChild(path: string): boolean;
  hasChildren(): boolean;
  key: string | null;
  numChildren(): number;
  ref: Reference;
  toJSON(): Object | null;
  val(): any;
}

interface Database {
  app: FirebaseApp;
  useEmulator(host: string, port: number): void;
  goOffline(): void;
  goOnline(): void;
  ref(path?: string | Reference): Reference;
  refFromURL(url: string): Reference;
}

declare class FirebaseDatabase implements Database {
  private constructor();
  app: FirebaseApp;
  useEmulator(host: string, port: number): void;
  goOffline(): void;
  goOnline(): void;
  ref(path?: string | Reference): Reference;
  refFromURL(url: string): Reference;
}

interface OnDisconnect {
  cancel(onComplete?: (a: Error | null) => any): Promise<void>;
  remove(onComplete?: (a: Error | null) => any): Promise<void>;
  set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;
  setWithPriority(
    value: any,
    priority: number | string | null,
    onComplete?: (a: Error | null) => any
  ): Promise<any>;
  update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
}

type EventType =
  | 'value'
  | 'child_added'
  | 'child_changed'
  | 'child_moved'
  | 'child_removed';

interface Query {
  endBefore(value: number | string | boolean | null, key?: string): Query;
  endAt(value: number | string | boolean | null, key?: string): Query;
  equalTo(value: number | string | boolean | null, key?: string): Query;
  isEqual(other: Query | null): boolean;
  limitToFirst(limit: number): Query;
  limitToLast(limit: number): Query;
  off(
    eventType?: EventType,
    callback?: (a: DataSnapshot, b?: string | null) => any,
    context?: Object | null
  ): void;
  get(): Promise<DataSnapshot>;
  on(
    eventType: EventType,
    callback: (a: DataSnapshot, b?: string | null) => any,
    cancelCallbackOrContext?: ((a: Error) => any) | Object | null,
    context?: Object | null
  ): (a: DataSnapshot, b?: string | null) => any;
  once(
    eventType: EventType,
    successCallback?: (a: DataSnapshot, b?: string | null) => any,
    failureCallbackOrContext?: ((a: Error) => void) | Object | null,
    context?: Object | null
  ): Promise<DataSnapshot>;
  orderByChild(path: string): Query;
  orderByKey(): Query;
  orderByPriority(): Query;
  orderByValue(): Query;
  ref: Reference;
  startAt(value: number | string | boolean | null, key?: string): Query;
  startAfter(value: number | string | boolean | null, key?: string): Query;
  toJSON(): Object;
  toString(): string;
}

interface Reference extends Query {
  child(path: string): Reference;
  key: string | null;
  onDisconnect(): OnDisconnect;
  parent: Reference | null;
  push(value?: any, onComplete?: (a: Error | null) => any): ThenableReference;
  remove(onComplete?: (a: Error | null) => any): Promise<any>;
  root: Reference;
  set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
  setPriority(
    priority: string | number | null,
    onComplete: (a: Error | null) => any
  ): Promise<any>;
  setWithPriority(
    newVal: any,
    newPriority: string | number | null,
    onComplete?: (a: Error | null) => any
  ): Promise<any>;
  transaction(
    transactionUpdate: (a: any) => any,
    onComplete?: (a: Error | null, b: boolean, c: DataSnapshot | null) => any,
    applyLocally?: boolean
  ): Promise<any>;
  update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
}

interface ServerValue {
  TIMESTAMP: Object;
  increment(delta: number): Object;
}

interface ThenableReference
  extends Reference,
  Pick<Promise<Reference>, 'then' | 'catch'> { }

declare function enableLogging(
  logger?: boolean | ((a: string) => any),
  persistent?: boolean
): any;
