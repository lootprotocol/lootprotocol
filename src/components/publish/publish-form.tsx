'use client';

import { useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { TypeSelector } from './type-selector';
import { SkillFields } from './skill-fields';
import { McpServerFields } from './mcp-server-fields';
import { PluginFields } from './plugin-fields';
import { MetadataForm, type MetadataFormValues } from './metadata-form';
import type { ExtensionType, ValidationResult } from '@lootprotocol/shared-types';
import Link from 'next/link';

// --- State ---

interface FormState {
  extensionType: ExtensionType | null;
  files: Record<string, File | null>;
  runtime: 'javascript' | 'python';
  metadata: MetadataFormValues;
  fieldErrors: Record<string, string>;
  metadataErrors: Record<string, string>;
  unmappedErrors: { message: string; path?: string }[];
  validationResult: ValidationResult | null;
  isSubmitting: boolean;
  publishedSlug: string | null;
}

type Action =
  | { type: 'SET_TYPE'; extensionType: ExtensionType }
  | { type: 'SET_FILE'; field: string; file: File | null }
  | { type: 'SET_RUNTIME'; runtime: 'javascript' | 'python' }
  | { type: 'SET_METADATA'; metadata: MetadataFormValues }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | {
      type: 'SET_ERRORS';
      fieldErrors: Record<string, string>;
      metadataErrors: Record<string, string>;
      unmappedErrors: { message: string; path?: string }[];
      validationResult: ValidationResult | null;
    }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_PUBLISHED'; slug: string };

const initialState: FormState = {
  extensionType: null,
  files: {},
  runtime: 'javascript',
  metadata: { displayName: '', category: '', tags: [] },
  fieldErrors: {},
  metadataErrors: {},
  unmappedErrors: [],
  validationResult: null,
  isSubmitting: false,
  publishedSlug: null,
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_TYPE':
      return {
        ...initialState,
        extensionType: action.extensionType,
      };
    case 'SET_FILE':
      return {
        ...state,
        files: { ...state.files, [action.field]: action.file },
        fieldErrors: { ...state.fieldErrors, [action.field]: '' },
      };
    case 'SET_RUNTIME':
      return {
        ...state,
        runtime: action.runtime,
        // Clear the dependency file when switching runtimes
        files: { ...state.files, 'package.json': null },
        fieldErrors: { ...state.fieldErrors, 'package.json': '' },
      };
    case 'SET_METADATA':
      return { ...state, metadata: action.metadata };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'SET_ERRORS':
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        metadataErrors: action.metadataErrors,
        unmappedErrors: action.unmappedErrors,
        validationResult: action.validationResult,
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        fieldErrors: {},
        metadataErrors: {},
        unmappedErrors: [],
        validationResult: null,
      };
    case 'SET_PUBLISHED':
      return { ...state, publishedSlug: action.slug, isSubmitting: false };
    default:
      return state;
  }
}

// --- Required fields per type ---

const REQUIRED_FILES: Record<ExtensionType, string[]> = {
  skill: ['SKILL.md'],
  mcp_server: ['mcp.json', 'package.json', 'README.md', 'source-archive'],
  plugin: ['plugin.json', 'README.md', 'component-bundle'],
};

// --- Component ---

export function PublishForm() {
  const [state, dispatch] = useReducer(reducer, initialState);

  function handleFileChange(field: string, file: File | null) {
    dispatch({ type: 'SET_FILE', field, file });
  }

  function clientValidate(): boolean {
    const errors: Record<string, string> = {};
    const metaErrors: Record<string, string> = {};
    let valid = true;

    if (!state.extensionType) return false;

    // Check required files
    for (const field of REQUIRED_FILES[state.extensionType]) {
      if (!state.files[field]) {
        errors[field] = 'This file is required';
        valid = false;
      }
    }

    // Check required metadata
    if (!state.metadata.displayName.trim()) {
      metaErrors.displayName = 'Display name is required';
      valid = false;
    }
    if (!state.metadata.category) {
      metaErrors.category = 'Category is required';
      valid = false;
    }

    if (!valid) {
      dispatch({
        type: 'SET_ERRORS',
        fieldErrors: errors,
        metadataErrors: metaErrors,
        unmappedErrors: [],
        validationResult: null,
      });
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'CLEAR_ERRORS' });

    if (!clientValidate()) return;

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });

    try {
      const formData = new FormData();
      formData.append('type', state.extensionType!);
      formData.append('displayName', state.metadata.displayName);
      formData.append('category', state.metadata.category);
      formData.append('tags', JSON.stringify(state.metadata.tags));

      // Append all files
      for (const [field, file] of Object.entries(state.files)) {
        if (file) formData.append(field, file);
      }

      const res = await fetch('/api/publish', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.status === 201 && data.data?.slug) {
        dispatch({ type: 'SET_PUBLISHED', slug: data.data.slug });
        return;
      }

      // Handle validation errors from server
      dispatch({
        type: 'SET_ERRORS',
        fieldErrors: data.fieldErrors || {},
        metadataErrors: {},
        unmappedErrors: data.unmappedErrors || [],
        validationResult: data.validation || null,
      });
    } catch {
      dispatch({
        type: 'SET_ERRORS',
        fieldErrors: {},
        metadataErrors: {},
        unmappedErrors: [{ message: 'Network error. Please try again.' }],
        validationResult: null,
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }

  // Success state
  if (state.publishedSlug) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12 text-center">
        <CheckCircle className="mx-auto size-16 text-green-500" />
        <h2 className="text-2xl font-bold">Published!</h2>
        <p className="text-muted-foreground">
          Your extension is now available on the marketplace.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href={`/extensions/${state.publishedSlug}`}>View Extension</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/explore">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      {/* 1. Type selection */}
      <TypeSelector
        selected={state.extensionType}
        onSelect={(t) => dispatch({ type: 'SET_TYPE', extensionType: t })}
      />

      {/* 2. File uploads */}
      {state.extensionType && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Upload Files</h2>
            <p className="text-sm text-muted-foreground">
              Upload each required file individually
            </p>
          </div>

          {state.extensionType === 'skill' && (
            <SkillFields
              files={state.files}
              onFileChange={handleFileChange}
              fieldErrors={state.fieldErrors}
            />
          )}
          {state.extensionType === 'mcp_server' && (
            <McpServerFields
              files={state.files}
              onFileChange={handleFileChange}
              fieldErrors={state.fieldErrors}
              runtime={state.runtime}
              onRuntimeChange={(r) => dispatch({ type: 'SET_RUNTIME', runtime: r })}
            />
          )}
          {state.extensionType === 'plugin' && (
            <PluginFields
              files={state.files}
              onFileChange={handleFileChange}
              fieldErrors={state.fieldErrors}
            />
          )}

          <Separator />

          {/* 3. Metadata */}
          <MetadataForm
            values={state.metadata}
            onChange={(m) => dispatch({ type: 'SET_METADATA', metadata: m })}
            errors={state.metadataErrors}
          />

          {/* 4. Error summary */}
          {state.unmappedErrors.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <XCircle className="mt-0.5 size-5 text-red-600 dark:text-red-400 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Validation errors
                </p>
                <ul className="space-y-1">
                  {state.unmappedErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-700 dark:text-red-400">
                      {err.message}
                      {err.path && (
                        <span className="text-red-500"> ({err.path})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {state.validationResult && state.validationResult.warnings.length > 0 && (
            <div className="space-y-2">
              {state.validationResult.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30"
                >
                  <AlertTriangle className="mt-0.5 size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {w.message}
                    {w.path && (
                      <span className="text-yellow-600 dark:text-yellow-500"> ({w.path})</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 5. Submit */}
          <Button type="submit" className="w-full" disabled={state.isSubmitting}>
            {state.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Extension'
            )}
          </Button>
        </>
      )}
    </form>
  );
}
