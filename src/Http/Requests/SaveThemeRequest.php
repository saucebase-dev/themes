<?php

namespace Modules\Themes\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveThemeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request. Each `cssVars` section is
     * capped so a request can't write an unbounded file.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $section = ['array', 'max:100'];
        $value = ['string', 'max:255'];

        return [
            'name' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'title' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
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
