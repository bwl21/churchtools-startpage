import { churchtoolsClient } from '@churchtools/churchtools-client';
import { Memberfield, queryClient } from '@churchtools/utils';
import { useQuery } from '@tanstack/vue-query';
import { ComputedRef, Ref, computed } from 'vue';
import { FIFTEEN_MINUTES } from '../utils/config';

export default function useGroupMemberfields(
    groupId: ComputedRef<number> | Ref<number>
) {
    const getGroupMemberfields = () => {
        return useQuery(
            {
                queryKey: ['groups', groupId, 'memberfields'],
                queryFn: () => {
                    return churchtoolsClient.get<Memberfield[]>(
                        `/groups/${groupId.value}/memberfields`
                    );
                },
                enabled: !!groupId,
                staleTime: FIFTEEN_MINUTES,
            },
            queryClient
        );
    };
    const { data: groupMemberfields } = getGroupMemberfields();

    const pureGroupMemberfields = computed(() =>
        (groupMemberfields.value ?? []).filter(
            (field) => field.type === 'group'
        )
    );

    const fields = computed(() =>
        (pureGroupMemberfields.value ?? []).map((field) => {
            if (field.type === 'group') {
                const groupField = field.field as any;
                return {
                    id: groupField.id,
                    key: groupField.fieldName || groupField.name,
                    name:
                        (groupField.nameInSignupForm || groupField.name) +
                        (groupField.requiredInRegistrationForm ? ' *' : ''),
                    note: groupField.noteInSignupForm || groupField.note || '',
                    fieldTypeCode: groupField.fieldTypeCode,
                    sortKey: groupField.sortKey || 0,
                    securityLevel: groupField.securityLevel || 0,
                    defaultValue: groupField.defaultValue || null,
                    maxLength: groupField.maxLength || null,
                    options: groupField.options || [],
                    useInRegistrationForm: groupField.useInRegistrationForm || false,
                    requiredInRegistrationForm:
                        groupField.requiredInRegistrationForm || false,
                };
            }
            const dbField = (field.field as any).dbField;
            return {
                id: field.field.id,
                key: dbField?.name || 'unknown',
                name:
                    (dbField?.name || 'Unknown Field') +
                    (dbField?.requiredInRegistrationForm ? ' *' : ''),
                note: '',
                fieldTypeCode: dbField?.fieldType?.internCode || 'text',
                sortKey: dbField?.sortKey || 0,
                securityLevel: dbField?.securityLevel || 0,
                defaultValue: null,
                maxLength: dbField?.length || null,
                options: dbField?.options ?? [],
                useInRegistrationForm: true,
                requiredInRegistrationForm:
                    dbField?.requiredInRegistrationForm || false,
            };
        })
    );

    const requiredFields = computed(() =>
        fields.value.filter((f) => f.requiredInRegistrationForm)
    );
    return { fields, requiredFields };
}
