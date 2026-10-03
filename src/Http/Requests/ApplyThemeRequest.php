<?php

namespace Modules\Themes\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ApplyThemeRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request. These values end up in
     * theme.css, so each `cssVars` section is capped, keys must be plain var names,
     * and values can't break out of their declaration (`;{}`, CSS escapes, comments) or load
     * anything from elsewhere (`url(`, `image-set(`).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $section = ['array', 'max:100', function (string $attribute, mixed $vars, Closure $fail): void {
            foreach (array_keys((array) $vars) as $key) {
                if (! preg_match('/^[a-z0-9-]+$/', (string) $key)) {
                    $fail(__('The :attribute field may only contain CSS variable names.'));

                    return;
                }
            }
        }];
        $value = ['string', 'max:255', 'not_regex:/[;{}\\\\]|\/\*|\*\/|url\(|image-set\(/i'];

        return [
            'cssVars' => ['required', 'array'],
            'cssVars.light' => ['required', ...$section],
            'cssVars.dark' => ['required', ...$section],
            'cssVars.theme' => ['nullable', ...$section],
            'cssVars.light.*' => $value,
            'cssVars.dark.*' => $value,
            'cssVars.theme.*' => $value,
        ];
    }
}
