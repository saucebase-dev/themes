<?php

namespace Modules\Themes\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

class SaveThemeRequest extends ApplyThemeRequest
{
    /**
     * Get the validation rules that apply to the request: a named theme's
     * metadata on top of the `cssVars` rules it shares with applying.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'title' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            ...parent::rules(),
        ];
    }
}
